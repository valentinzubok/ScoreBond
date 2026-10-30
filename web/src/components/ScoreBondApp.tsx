"use client";

import { useCallback, useEffect, useState } from "react";
import { CHAIN_ID, CONTRACT_ADDRESS, DEMO_DELIVERY, DEMO_RUBRIC, EXPLORER, GITHUB, txUrl } from "@/lib/config";
import {
  PAGE_SIZE,
  deliver,
  expire,
  getBond,
  getBooks,
  getCredit,
  getDelivery,
  getRecentEvents,
  getRound,
  getSchedule,
  listBonds,
  openBond,
  score,
  settle,
  withdraw,
  withdrawCredit,
  type Bond,
  type Books,
  type Delivery,
  type EventRow,
  type RoundRecord,
  type Schedule,
} from "@/lib/contracts";
import { creditOutcome, deliverOutcome, openOutcome, roundOutcome, settleOutcome, withdrawOutcome, type Outcome } from "@/lib/outcome";
import { fundWithTestGen, getNativeBalance, type TxStage } from "@/lib/genlayer";
import { useWallet } from "./WalletProvider";

const short = (h: string, n = 10) => (h ? `${h.slice(0, n)}…${h.slice(-4)}` : "—");
const utc = (seconds: number) =>
  seconds ? `${new Date(seconds * 1000).toISOString().replace("T", " ").slice(0, 19)} UTC` : "—";

/** Wei as GEN, trimmed: 1500000000000000000 -> "1.5". */
const fmtGen = (wei: string | number | undefined) => {
  let v: bigint;
  try {
    v = BigInt(wei || 0);
  } catch {
    return "0";
  }
  const whole = v / BigInt(10 ** 18);
  const frac = (v % BigInt(10 ** 18)).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : `${whole}`;
};

/** GEN typed by a person as wei, or "" when it is not a number. */
const toWei = (text: string) => {
  const m = /^(\d+)(?:\.(\d{1,18}))?$/.exec(text.trim());
  if (!m) return "";
  return (BigInt(m[1]) * BigInt(10 ** 18) + BigInt((m[2] || "").padEnd(18, "0") || "0")).toString();
};

const STATUS: Record<string, string> = {
  open: "open · deliveries and scoring in progress",
  met: "MET · the provider takes the bond back",
  breached: "BREACHED · the client takes the bond",
  void: "void · nobody settled in time, the provider takes the bond back",
};

const REASON: Record<string, string> = {
  model_says_unscorable: "validators could not judge the page against the rubric",
  model_failed: "the model did not answer",
  not_json: "the model did not answer in JSON",
  not_object: "the model answer was not an object",
  bad_score: "the answer was not a whole number from 0 to 100",
};

function Flow() {
  return (
    <div className="roundsbox" aria-hidden="true">
      <p className="q">Did the delivered work meet the promise the bond backs?</p>
      <div className="lane">
        <span>deliver</span>
        <span className="bar yes">the page is frozen whole on chain</span>
      </div>
      <div className="lane">
        <span>score</span>
        <span className="bar yes">validators score 0–100 against the fixed rubric</span>
      </div>
      <div className="lane">
        <span>sum</span>
        <span className="bar no">median of the rounds · total vs bar × deliveries</span>
      </div>
      <p className="gap">⋮ the code does the sums, before the final deadline</p>
      <div className="lane">
        <span>result</span>
        <span className="bar final">provider keeps the bond · or the client takes it</span>
      </div>
    </div>
  );
}

function DeliveryView({
  b,
  d,
  rounds,
  canScore,
  disabled,
  onScore,
}: {
  b: Bond;
  d: Delivery;
  rounds: RoundRecord[];
  canScore: boolean;
  disabled: boolean;
  onScore: () => void;
}) {
  const [showPage, setShowPage] = useState(false);
  return (
    <li>
      <strong>
        delivery {d.n}: {d.final_score >= 0 ? `final score ${d.final_score}/100` : `scoring · ${d.scores.length} of ${b.score_rounds} readings`}
      </strong>{" "}
      <span className="muted">
        · {utc(d.delivered_at)} · page sha-256 {d.content_hash.slice(0, 12)}… ·{" "}
        <button className="ghost tiny" onClick={() => setShowPage(!showPage)}>
          {showPage ? "hide the frozen page" : `show the frozen page (${d.total_chars} chars)`}
        </button>
      </span>
      {showPage && (
        <div className="hashline" style={{ whiteSpace: "pre-wrap", marginTop: "0.4rem" }}>
          {d.url}
          {"\n"}
          {d.text}
        </div>
      )}
      <ul className="timeline">
        {rounds.map((r) => (
          <li key={r.round}>
            round {r.round}: {r.finding === "scored" ? `${r.score}/100` : "no score"}{" "}
            <span className="muted">
              ({r.outcome}
              {r.reason ? ` · ${REASON[r.reason] || r.reason}` : ""}) · {r.at_text}
            </span>
          </li>
        ))}
      </ul>
      {d.final_score < 0 && (
        <button className="ghost tiny" disabled={disabled || !canScore} onClick={onScore}>
          {canScore ? "run a scoring round" : `next round from ${utc(d.last_round_at + b.round_interval)}`}
        </button>
      )}
    </li>
  );
}

function BondCard({
  b,
  sch,
  deliveries,
  rounds,
  me,
  disabled,
  deliveryUrl,
  onPick,
  onDeliver,
  onScore,
  onSettle,
  onExpire,
  onWithdraw,
}: {
  b: Bond;
  sch?: Schedule;
  deliveries: Delivery[];
  rounds: Record<number, RoundRecord[]>;
  me: string | null;
  disabled: boolean;
  deliveryUrl: string;
  onPick: () => void;
  onDeliver: () => void;
  onScore: (n: number) => void;
  onSettle: () => void;
  onExpire: () => void;
  onWithdraw: () => void;
}) {
  const same = (a: string) => !!me && a.toLowerCase() === me.toLowerCase();
  return (
    <article className="card" style={{ marginTop: "1rem" }}>
      <div className="head">
        <span className="id">{b.bond_id}</span>
        <span className="muted">{STATUS[b.status] || b.status}</span>
      </div>
      <p>
        <button className="ghost tiny" onClick={onPick}>
          use this bond above
        </button>
      </p>
      <p className="claimtext">{b.title}</p>
      <p className="hashline">
        bond {fmtGen(b.bond)} GEN · provider {short(b.provider)} · client {short(b.client)} · bar {b.pass_score}/100 per delivery · total
        needed {b.needed_score} · {b.deliveries_required} deliver{b.deliveries_required === 1 ? "y" : "ies"} promised
      </p>
      <p className="hashline">
        deliveries until {utc(b.delivery_deadline)} · final deadline {utc(b.final_deadline)} · {b.score_rounds} scoring round
        {b.score_rounds === 1 ? "" : "s"} per delivery, {b.round_interval}s apart
      </p>
      <p className="hashline">rubric: {b.rubric}</p>
      {b.injection_flags.length > 0 && <p className="msg">Instruction-like phrasing was flagged: {b.injection_flags.join(", ")}.</p>}
      {deliveries.length > 0 && (
        <ul className="timeline">
          {deliveries.map((d) => (
            <DeliveryView
              key={d.n}
              b={b}
              d={d}
              rounds={rounds[d.n] || []}
              canScore={!!sch?.scorable.includes(d.n)}
              disabled={disabled}
              onScore={() => onScore(d.n)}
            />
          ))}
        </ul>
      )}
      {b.status !== "open" && b.total_score >= 0 && (
        <p className="hashline">
          total score {b.total_score} vs {b.needed_score} needed ({b.delivered} of {b.deliveries_required} delivered; a missing one counts 0)
        </p>
      )}
      {sch?.can_deliver && same(b.provider) && (
        <button className="ghost" disabled={disabled || !deliveryUrl} onClick={onDeliver}>
          hand in the delivery page above
        </button>
      )}
      {b.status === "open" && (
        <button className="ghost" style={{ marginLeft: "0.5rem" }} disabled={disabled || !sch?.can_settle} onClick={onSettle}>
          {sch?.can_expire
            ? "final deadline passed · only void is accepted"
            : sch && !sch.can_settle
              ? sch.pending > 0
                ? "waiting for every delivery to be scored"
                : "waiting for the deliveries"
              : "settle: count the scores"}
        </button>
      )}
      {sch?.can_expire && (
        <button className="ghost" style={{ marginLeft: "0.5rem" }} disabled={disabled} onClick={onExpire}>
          void the bond
        </button>
      )}
      {sch?.can_withdraw && same(b.beneficiary) && (
        <button className="ghost" style={{ marginLeft: "0.5rem" }} disabled={disabled} onClick={onWithdraw}>
          take the bond ({fmtGen(b.bond)} GEN)
        </button>
      )}
    </article>
  );
}

export function ScoreBondApp() {
  const { address, provider, connect, error: walletError } = useWallet();
  const [rows, setRows] = useState<Bond[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [rounds, setRounds] = useState<Record<string, Record<number, RoundRecord[]>>>({});
  const [books, setBooks] = useState<Books | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [credit, setCredit] = useState(BigInt(0));
  const [gen, setGen] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [err, setErr] = useState("");
  const [tx, setTx] = useState("");
  const [stage, setStage] = useState<TxStage | "">("");

  const [bid, setBid] = useState("harbor/docs-sprint");
  const [client, setClient] = useState("");
  const [title, setTitle] = useState("Contributor guide");
  const [rubric, setRubric] = useState(DEMO_RUBRIC);
  const [passScore, setPassScore] = useState("70");
  const [promised, setPromised] = useState("1");
  const [deliveryWindow, setDeliveryWindow] = useState("300");
  const [scoreWindow, setScoreWindow] = useState("900");
  const [roundsReq, setRoundsReq] = useState("1");
  const [interval, setIntervalSeconds] = useState("60");
  const [bondGen, setBondGen] = useState("2");
  const [deliveryUrl, setDeliveryUrl] = useState(DEMO_DELIVERY);

  const loadBonds = useCallback(async (count: number) => {
    // Newest first, one page at a time: the console never reads the whole registry.
    const first = await listBonds(0, 1);
    const n = first.total;
    setTotal(n);
    const start = Math.max(0, n - count);
    const page = await listBonds(start, Math.min(count, n));
    const ids = page.items.map((x) => x[0]).reverse();
    const bonds = (await Promise.all(ids.map((id) => getBond(id)))).filter(Boolean) as Bond[];
    setRows(bonds);
    setLoaded(ids.length);
    const sc = await Promise.all(ids.map((id) => getSchedule(id)));
    setSchedules(Object.fromEntries(sc.filter(Boolean).map((x) => [(x as Schedule).bond_id, x as Schedule])));
    const ds = await Promise.all(
      bonds.map(async (b) => (await Promise.all(Array.from({ length: b.delivered }, (_, i) => getDelivery(b.bond_id, i + 1)))).filter(Boolean) as Delivery[]),
    );
    setDeliveries(Object.fromEntries(bonds.map((b, i) => [b.bond_id, ds[i]])));
    const rs = await Promise.all(
      bonds.map(async (b, i) => {
        const byDelivery: Record<number, RoundRecord[]> = {};
        for (const d of ds[i]) {
          byDelivery[d.n] = (await Promise.all(Array.from({ length: d.rounds }, (_, k) => getRound(b.bond_id, d.n, k + 1)))).filter(Boolean) as RoundRecord[];
        }
        return byDelivery;
      }),
    );
    setRounds(Object.fromEntries(bonds.map((b, i) => [b.bond_id, rs[i]])));
  }, []);

  const refresh = useCallback(
    async (count = Math.max(PAGE_SIZE, loaded)) => {
      setLoading(true);
      try {
        const [ev, b] = await Promise.all([getRecentEvents(10), getBooks()]);
        setBooks(b);
        setEvents(ev);
        await loadBonds(count);
        if (address) {
          setGen(await getNativeBalance(address));
          setCredit(await getCredit(address));
        } else {
          setCredit(BigInt(0));
        }
      } catch (e) {
        setErr(`Error: ${e instanceof Error ? e.message : "read failed"}`);
      } finally {
        setLoading(false);
      }
    },
    [address, loadBonds, loaded],
  );

  useEffect(() => {
    void refresh(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const onStage = (next: TxStage, hash: string) => {
    setTx(hash);
    setStage(next);
    if (next === "finalized") void refresh();
  };

  /** Send, then decide success from chain state - never from the receipt alone. */
  const run = async (name: string, fn: () => Promise<string | void>, check?: () => Promise<Outcome>) => {
    if (!address || !provider) {
      setErr("Connect MetaMask for writes");
      return;
    }
    setBusy(name);
    setErr("");
    setOutcome(null);
    setStage("");
    try {
      const hash = await fn();
      if (hash) setTx(hash);
      if (check) setOutcome(await check());
      await refresh();
    } catch (e) {
      setErr(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  };

  const acct = address as `0x${string}`;
  const disabled = !!busy || !address;
  const bondWei = toWei(bondGen);

  const doOpen = () => {
    const before = credit;
    void run(
      "open_bond",
      () =>
        openBond(
          acct,
          provider,
          { id: bid, client, title, rubric, passScore, deliveries: promised, deliveryWindow, scoreWindow, rounds: roundsReq, interval, bond: bondWei },
          onStage,
        ),
      async () => openOutcome(await getBond(bid), acct, before, await getCredit(acct), BigInt(bondWei || "0")),
    );
  };

  const doDeliver = (b: Bond) => {
    const before = b.delivered;
    void run(
      "deliver",
      () => deliver(acct, provider, b.bond_id, deliveryUrl, onStage),
      async () => deliverOutcome(before, (await getBond(b.bond_id))?.delivered ?? before),
    );
  };

  const doScore = (b: Bond, n: number) => {
    const before = (deliveries[b.bond_id] || []).find((d) => d.n === n)?.rounds ?? 0;
    void run(
      "score",
      () => score(acct, provider, b.bond_id, n, onStage),
      async () => {
        const d = await getDelivery(b.bond_id, n);
        return roundOutcome(before, d ? await getRound(b.bond_id, n, d.rounds) : null);
      },
    );
  };

  const doSettle = (b: Bond) =>
    void run("settle", () => settle(acct, provider, b.bond_id, onStage), async () => settleOutcome((await getBond(b.bond_id))?.status ?? "open"));

  const doWithdraw = (b: Bond) =>
    void run("withdraw", () => withdraw(acct, provider, b.bond_id, onStage), async () => withdrawOutcome(!!(await getBond(b.bond_id))?.paid));

  return (
    <main className="wrap">
      <section className="hero">
        <div>
          <h1>
            Score<span className="accent">Bond</span>
          </h1>
          <p className="lede">
            A provider promises quality and backs it with a bond. Nobody argues afterwards: each
            delivery is <strong>frozen whole on chain</strong>, validators <strong>score it 0–100</strong>{" "}
            against a rubric fixed when the bond was posted, and the <strong>contract does the sums</strong>{" "}
            (median of the rounds, total against the bar). Reach the bar and the provider keeps the
            bond; fall short and the client takes it.
          </p>
          <div className="chips">
            <span className="chip">
              chain <b>{CHAIN_ID}</b>
            </span>
            <span className="chip">
              bonds <b>{total}</b>
            </span>
            {books && (
              <span className="chip">
                held now <b>{fmtGen(books.balance)} GEN</b>
              </span>
            )}
          </div>
          <p className="muted" style={{ marginTop: "0.8rem" }}>
            Contract <a href={EXPLORER}>{short(CONTRACT_ADDRESS, 12)}</a> · nobody is privileged ·{" "}
            <a href={GITHUB}>source</a>
          </p>
          <div>
            {!address ? (
              <button onClick={() => void connect()}>Connect MetaMask</button>
            ) : (
              <span className="pill">
                <span className="dot" /> {short(address)} · {gen || "?"} GEN
              </span>
            )}
            {address && (
              <button
                className="ghost"
                style={{ marginLeft: "0.5rem" }}
                disabled={!!busy}
                onClick={() =>
                  void run("Get test GEN", async () => {
                    await fundWithTestGen(acct);
                  })
                }
              >
                Get test GEN
              </button>
            )}
          </div>
          {address && credit > BigInt(0) && (
            <p className="verdictbox">
              The contract holds <strong>{fmtGen(credit.toString())} GEN</strong> for you from a bond it
              refused.{" "}
              <button
                className="ghost tiny"
                disabled={!!busy}
                onClick={() => {
                  const before = credit;
                  void run("withdraw_credit", () => withdrawCredit(acct, provider, onStage), async () => creditOutcome(before, await getCredit(acct)));
                }}
              >
                take it back
              </button>
            </p>
          )}
          {outcome && (
            <p className={outcome.verdict === "done" ? "okmsg" : "msg"}>
              <strong>{outcome.title}.</strong> {outcome.detail}
            </p>
          )}
          {walletError && <p className="msg">{walletError}</p>}
          {err && <p className="msg">{err}</p>}
          {tx && (
            <p className="tx muted">
              last tx <a href={txUrl(tx)}>{short(tx, 14)}</a>{" "}
              {stage === "finalized" ? (
                <span className="stagepill final">finalized · payouts have landed</span>
              ) : (
                <span className="stagepill accepted">accepted — awaiting finalization</span>
              )}
            </p>
          )}
        </div>
        <Flow />
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Before you rely on a bond: what is fixed, and what you trust</h2>
        <ul className="decide">
          <li>
            <span className="tag">the rubric</span> is written by the provider and fixed when the bond
            is posted. You trust that it asks for what you were promised; read it before you buy the
            service, it is exactly what validators will score against.
          </li>
          <li>
            <span className="tag">the score</span> validators only propose a whole number 0–100; anything
            else counts for nothing. With three rounds the <strong>median</strong> is used, chosen in
            code, so one odd reading cannot decide. Scores can vary a little between readings.
          </li>
          <li>
            <span className="tag">the pages</span> each delivery is frozen whole (at most 3000
            characters). Edits afterwards change nothing. A promised delivery that never came counts 0.
          </li>
          <li>
            <span className="tag">the deadline</span> scoring and settling work only before the final
            deadline; from it on, only void, which returns the bond to the provider. Nobody can choose
            the outcome by transaction order.
          </li>
        </ul>
      </section>

      <div className="row">
        <section className="card">
          <h2>Post a bond</h2>
          <label htmlFor="bid">Bond id</label>
          <input id="bid" value={bid} onChange={(e) => setBid(e.target.value)} />
          <label htmlFor="client">Client address (the party the bond protects)</label>
          <input id="client" value={client} placeholder="0x…" onChange={(e) => setClient(e.target.value)} />
          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label htmlFor="rubric">Rubric validators score against</label>
          <textarea id="rubric" rows={3} value={rubric} onChange={(e) => setRubric(e.target.value)} />
          <div className="grid2">
            <div>
              <label htmlFor="bond">Bond (GEN, at least 1)</label>
              <input id="bond" value={bondGen} onChange={(e) => setBondGen(e.target.value)} />
            </div>
            <div>
              <label htmlFor="pass">Bar per delivery (1–100)</label>
              <input id="pass" value={passScore} onChange={(e) => setPassScore(e.target.value)} />
            </div>
            <div>
              <label htmlFor="promised">Deliveries promised (1–3)</label>
              <input id="promised" value={promised} onChange={(e) => setPromised(e.target.value)} />
            </div>
            <div>
              <label htmlFor="rounds">Scoring rounds (1 or 3)</label>
              <input id="rounds" value={roundsReq} onChange={(e) => setRoundsReq(e.target.value)} />
            </div>
            <div>
              <label htmlFor="dwin">Delivery window (s)</label>
              <input id="dwin" value={deliveryWindow} onChange={(e) => setDeliveryWindow(e.target.value)} />
            </div>
            <div>
              <label htmlFor="swin">Scoring window after it (s)</label>
              <input id="swin" value={scoreWindow} onChange={(e) => setScoreWindow(e.target.value)} />
            </div>
            <div>
              <label htmlFor="interval">Interval between rounds (s)</label>
              <input id="interval" value={interval} onChange={(e) => setIntervalSeconds(e.target.value)} />
            </div>
          </div>
          <button disabled={disabled || !bid || !client || !title || !rubric || bondWei === ""} onClick={doOpen}>
            {busy === "open_bond" ? (
              <span className="working">
                <span className="spinner" /> posting the bond…
              </span>
            ) : (
              `escrow ${bondGen || "0"} GEN as the bond`
            )}
          </button>
        </section>

        <section className="card">
          <h2>Deliver</h2>
          <p className="muted">
            The provider hands in a page; it is frozen whole when the transaction lands. Pick a bond
            below and press <em>hand in the delivery page</em>.
          </p>
          <label htmlFor="durl">Delivery page (https, at most 3000 characters)</label>
          <input id="durl" value={deliveryUrl} onChange={(e) => setDeliveryUrl(e.target.value)} />
          <ol className="decide">
            <li>The provider posts the bond and delivers before the delivery deadline.</li>
            <li>Anyone runs scoring rounds, a full interval apart per delivery.</li>
            <li>Anyone settles once every delivery made is scored.</li>
            <li>Whoever the outcome names takes the bond. Nothing settled in time: void, bond back to the provider.</li>
          </ol>
          <p className="muted">
            Anything the contract refuses (bond below 1 GEN, a taken id, bad terms) is shown as
            &quot;NOT posted&quot; with your credit and a button to take it back.
          </p>
        </section>
      </div>

      <section style={{ marginTop: "2rem" }}>
        <div className="head">
          <h2>Bonds on chain (newest first)</h2>
          <button className="ghost" disabled={loading} onClick={() => void refresh()}>
            {loading ? "reading…" : "refresh"}
          </button>
        </div>
        {rows.length === 0 && !loading && <p className="muted">No bonds yet.</p>}
        {rows.map((b) => (
          <BondCard
            key={b.bond_id}
            b={b}
            sch={schedules[b.bond_id]}
            deliveries={deliveries[b.bond_id] || []}
            rounds={rounds[b.bond_id] || {}}
            me={address}
            disabled={disabled}
            deliveryUrl={deliveryUrl}
            onPick={() => setBid(b.bond_id)}
            onDeliver={() => doDeliver(b)}
            onScore={(n) => doScore(b, n)}
            onSettle={() => doSettle(b)}
            onExpire={() => void run("expire", () => expire(acct, provider, b.bond_id, onStage))}
            onWithdraw={() => doWithdraw(b)}
          />
        ))}
        {loaded < total && (
          <button className="ghost" style={{ marginTop: "1rem" }} disabled={loading} onClick={() => void refresh(loaded + PAGE_SIZE)}>
            load {Math.min(PAGE_SIZE, total - loaded)} older bonds ({total - loaded} not shown)
          </button>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Recent events</h2>
        {events.length === 0 ? (
          <p className="muted">No events yet.</p>
        ) : (
          <ul className="timeline">
            {events.map((e) => (
              <li key={e.n}>
                <strong>{String(e.event)}</strong>{" "}
                <span className="muted">
                  {[e.bond_id, e.delivery ? `delivery ${e.delivery}` : null, e.round ? `round ${e.round}` : null, e.finding, e.outcome, e.status, e.bond ? `${fmtGen(String(e.bond))} GEN` : null, e.amount ? `${fmtGen(String(e.amount))} GEN` : null]
                    .filter(Boolean)
                    .map(String)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="foot">
        ScoreBond on GenLayer Studio Dev (chain {CHAIN_ID}). Reads work without a wallet; writes need
        MetaMask and test GEN. The demo delivery pages are files in this repository.
      </footer>
    </main>
  );
}
