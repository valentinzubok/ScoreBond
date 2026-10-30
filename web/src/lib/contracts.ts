import { CONTRACT_ADDRESS } from "./config";
import { type Address, type TxStage, parseJson, readContract, writeAndWait } from "./genlayer";

export type Bond = {
  bond_id: string;
  provider: string;
  client: string;
  title: string;
  rubric: string;
  bond: string;
  pass_score: number;
  deliveries_required: number;
  score_rounds: number;
  round_interval: number;
  created_at: number;
  delivery_deadline: number;
  final_deadline: number;
  status: "open" | "met" | "breached" | "void";
  delivered: number;
  scored: number;
  total_score: number;
  needed_score: number;
  beneficiary: string;
  settled_at: number;
  paid: boolean;
  injection_flags: string[];
};

export type Delivery = {
  n: number;
  url: string;
  text: string;
  content_hash: string;
  total_chars: number;
  delivered_at: number;
  rounds: number;
  scores: number[];
  last_round_at: number;
  final_score: number;
};

export type RoundRecord = {
  bond_id: string;
  delivery: number;
  round: number;
  at: number;
  at_text: string;
  by: string;
  page_hash: string;
  finding: "scored" | "unscored";
  reason: string;
  score: number;
  outcome: "counted" | "final" | "no_score";
  final_score: number;
  injection_flags: string[];
};

export type Schedule = {
  bond_id: string;
  now: number;
  status: string;
  delivery_deadline: number;
  final_deadline: number;
  can_deliver: boolean;
  scorable: number[];
  can_settle: boolean;
  can_expire: boolean;
  can_withdraw: boolean;
  delivered: number;
  scored: number;
  pending: number;
};
export type Books = { balance: string; held: string; credits: string };
export type EventRow = { event: string; n: number; [key: string]: unknown };
export type PageOf<T> = { total: number; offset: number; items: T[] };

type OnStage = (stage: TxStage, hash: string) => void;
const read = (fn: string, args: (string | number)[] = []) =>
  readContract<string>(CONTRACT_ADDRESS, fn, args as never[]);

export const PAGE_SIZE = 20;

/** One page of [bond_id, status]. Never the whole registry. */
export async function listBonds(offset: number, limit = PAGE_SIZE): Promise<PageOf<[string, string]>> {
  return parseJson(await read("list_bonds", [offset, limit]), { total: 0, offset, items: [] });
}
export async function getBond(id: string): Promise<Bond | null> {
  try {
    const b = parseJson<Bond>(await read("get_bond", [id]), {} as Bond);
    return b.bond_id ? b : null;
  } catch {
    return null;
  }
}
export async function getDelivery(id: string, n: number): Promise<Delivery | null> {
  try {
    const d = parseJson<Delivery>(await read("get_delivery", [id, n]), {} as Delivery);
    return d.n ? d : null;
  } catch {
    return null;
  }
}
export async function getRound(id: string, n: number, k: number): Promise<RoundRecord | null> {
  try {
    const r = parseJson<RoundRecord>(await read("get_round", [id, n, k]), {} as RoundRecord);
    return r.bond_id ? r : null;
  } catch {
    return null;
  }
}
export async function getSchedule(id: string): Promise<Schedule | null> {
  const s = parseJson<Schedule>(await read("get_schedule", [id]), {} as Schedule);
  return s.bond_id ? s : null;
}
export async function getBooks(): Promise<Books | null> {
  return parseJson<Books | null>(await read("get_balance"), null);
}
/** The newest events: the last page of the paged event log. */
export async function getRecentEvents(count = 10): Promise<EventRow[]> {
  const head = parseJson<PageOf<EventRow>>(await read("get_events", [0, 1]), { total: 0, offset: 0, items: [] });
  const start = Math.max(0, head.total - count);
  const page = parseJson<PageOf<EventRow>>(await read("get_events", [start, count]), { total: 0, offset: 0, items: [] });
  return page.items.slice().reverse();
}
export async function getCredit(address: string): Promise<bigint> {
  try {
    return BigInt((await read("get_credit", [address])) || "0");
  } catch {
    return BigInt(0);
  }
}

export type NewBond = {
  id: string;
  client: string;
  title: string;
  rubric: string;
  passScore: string;
  deliveries: string;
  deliveryWindow: string;
  scoreWindow: string;
  rounds: string;
  interval: string;
  /** The bond in wei; it travels as the transaction's value. */
  bond: string;
};

export async function openBond(account: Address, provider: unknown, p: NewBond, on?: OnStage) {
  return writeAndWait(
    account,
    provider,
    CONTRACT_ADDRESS,
    "open_bond",
    [p.id, p.client, p.title, p.rubric, p.passScore, p.deliveries, p.deliveryWindow, p.scoreWindow, p.rounds, p.interval],
    on,
    BigInt(p.bond || "0"),
  );
}

const simple = (fn: string) => (account: Address, provider: unknown, id: string, on?: OnStage) =>
  writeAndWait(account, provider, CONTRACT_ADDRESS, fn, [id], on);
export const settle = simple("settle");
export const expire = simple("expire");
export const withdraw = simple("withdraw");

export async function deliver(account: Address, provider: unknown, id: string, url: string, on?: OnStage) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "deliver", [id, url], on);
}
export async function score(account: Address, provider: unknown, id: string, n: number, on?: OnStage) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "score", [id, n], on);
}
export async function withdrawCredit(account: Address, provider: unknown, on?: OnStage) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "withdraw_credit", [], on);
}
