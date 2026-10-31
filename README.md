# ScoreBond

<p align="center">
  <img src="assets/logo.png" alt="ScoreBond" width="120" />
</p>

<p align="center">
  <strong>A service guarantee: validators score each delivery against a fixed rubric, the contract does the sums, and the bond goes to whoever the total names.</strong>
</p>

<p align="center">
  <a href="https://valentinzubok.github.io/ScoreBond/"><img src="https://img.shields.io/badge/Live-Console-f59e0b?style=flat-square" alt="Live console" /></a>
  <a href="https://github.com/valentinzubok/ScoreBond/actions/workflows/ci.yml"><img src="https://github.com/valentinzubok/ScoreBond/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/GenLayer-Studio%20Dev%2061997-f59e0b?style=flat-square" alt="Studio Dev" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT" /></a>
</p>

---

## The trust problem

A provider says "the work will be good" and posts a bond to prove it. When the work arrives, who
decides whether it was good? The provider will say yes, the client will say no, and a judge in
between is a person you have to trust. A model that scores the work is not enough either: it can be
talked into a high mark by the page it is scoring, and one odd reading would decide a whole bond.

**ScoreBond fixes the rubric before any work exists, freezes every delivery whole on chain, lets
validators only propose a number, and leaves the sums to the contract.**

```
open_bond(bond_id, client, title, rubric, pass_score, deliveries_required,
          delivery_window, score_window, score_rounds, round_interval)       PAYABLE, >= 1 GEN
deliver(bond_id, url)    the provider only, strictly BEFORE the delivery deadline;
                         the page (at most 3000 characters) is frozen whole on chain
score(bond_id, n)        anyone: one scoring round of delivery n, a full interval after the
                         previous round of that delivery, before the final deadline.
                         Validators answer a whole number 0-100; with 3 rounds the MEDIAN is the
                         delivery's final score, chosen in code
settle(bond_id)          anyone, before the final deadline, once every delivery made is scored and
                         the promised deliveries are in or the delivery deadline has passed.
                         total >= pass_score x deliveries -> MET (provider keeps the bond)
                         below -> BREACHED (the client takes it); a missing delivery counts 0
expire(bond_id)          anyone, AT or after the final deadline, if not settled: VOID, the bond
                         returns to the provider
withdraw(bond_id)        the party the outcome names, once
withdraw_credit()        take back what a payable call refused to escrow
get_round(bond_id, n, k) every scoring round, kept for good
list_bonds(offset, limit) / get_events(offset, limit)      paged, no global cap
```

## What a client can check before relying on a bond

| Question | Answer |
|---|---|
| What are the work and the bar? | The rubric, the bar per delivery, the number of deliveries and the deadlines are fixed when the bond is posted; there are no setters and no owner. |
| Can the page talk the model into a good mark? | The page is fenced as untrusted data and instruction-like phrasing is flagged and stored with every round. The model only proposes a whole number 0-100; a string, a float, a boolean or a number out of range counts for nothing. |
| Can one odd reading decide the bond? | With `score_rounds = 3` the final score of a delivery is the **median** of three readings a full interval apart, computed in code. An odd number of rounds is required, so the median is always one real reading. |
| What is scored? | The page frozen whole when the provider delivered it (at most 3000 characters, so validators read all of it). Editing the live page afterwards changes nothing. |
| What if validators cannot score? | An `unscored` round counts for nothing and is kept as evidence. A delivery nobody could score by the final deadline ends the bond VOID: the bond returns to the provider. |
| Can the provider skip a delivery? | A promised delivery that never came counts 0 in the total. |
| Can transaction order choose who is paid? | No. `score` and `settle` work only before the final deadline and `expire` only at or after it; `get_schedule` never offers both. |
| Can the registry fill up? | No cap: bonds, deliveries, rounds and events live in `TreeMap`s with a `DynArray` index; a bond costs at least 1 GEN; views are paged. |
| A refused call that swallows money? | Payable calls never raise once value is attached: what cannot be escrowed becomes a credit and `withdraw_credit` pays it back. |

**What you still trust:** that the rubric asks for what you were promised (the provider writes it:
read it before you buy the service), and that validators' scores of the same page stay close to each
other. Scores vary a little between readings; consensus allows a spread of 10 points.

## Live

| | |
|---|---|
| Console | **https://valentinzubok.github.io/ScoreBond/** (reads work with no wallet) |
| Network | GenLayer Studio Dev / Studio Next — chain `61997` |
| Contract | [`0xb68dC2fF071862504aC325EA9F0261db3B53Da1b`](https://explorer-studio-dev.genlayer.com/address/0xb68dC2fF071862504aC325EA9F0261db3B53Da1b) — CI checks the deployed code equals [`contracts/ScoreBond.py`](contracts/ScoreBond.py) |
| Deploy record | [`STUDIO_DEV_DEPLOY.md`](STUDIO_DEV_DEPLOY.md) — every transaction of the demo, including the refused ones |

## Demo delivery pages

Files in this repository, read from `raw.githubusercontent.com`:
[`good-guide.md`](web/public/fixtures/deliveries/good-guide.md) (a concrete contributor guide),
[`thin-guide.md`](web/public/fixtures/deliveries/thin-guide.md) (one vague line) and
[`long.md`](web/public/fixtures/deliveries/long.md) (longer than 3000 characters, refused at delivery).

## Lint

`sh scripts/lint_current_sdk.sh` runs the official GenVM linter (`lint`, `check`, `typecheck`); CI
runs it on every push. Every refusal raises `gl.vm.UserError`; every method takes `self`.

## The console

[`web/`](web/) — Next.js 16 + `genlayer-js` + MetaMask, static export to Pages. It shows the trust
card before any money moves, every delivery's frozen page, every scoring round with its score, the
total against the bar and the deadlines. Success is decided by reading the contract **after** the call
([`outcome.ts`](web/src/lib/outcome.ts)): a refused bond is shown as "NOT posted" with the credit and a
button to take it back.

```bash
cd web && npm install
npm test        # 13 tests
npm run dev     # http://localhost:3021
```

## Tests

```bash
pip install -r requirements-dev.txt
python3 -m pytest -q      # 84 tests
```

[`tests/test_scorebond.py`](tests/test_scorebond.py): the outcomes and who may collect; ten kinds of
score the code refuses; the median of three rounds; unscored and broken answers; a forged consensus
answer; several deliveries and the total against `bar x deliveries`; a missing delivery counting 0;
who may deliver; the frozen page and fencing of injected text; intervals; the final deadline (one
second before, at, after; competing calls; the schedule at every second); evidence kept per round; no
registry cap; 16 refused bonds credited; and the books balancing through a 240-step random run.

## License

[MIT](LICENSE) © 2026 Valentyn Zubok
