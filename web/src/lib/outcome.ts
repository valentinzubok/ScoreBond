/**
 * A transaction can be accepted by consensus and still not do what the user asked: the
 * contract refuses a bond in its return value and books the money as a credit (a refused
 * payable call must not revert, or the value would be lost), and a scoring round may produce
 * no score. The console therefore never reports success from the receipt alone. It reads the
 * chain after the call and decides with these functions, which are pure so they can be tested.
 */

export type Verdict = "done" | "refused" | "pending";

export type Outcome = {
  verdict: Verdict;
  title: string;
  detail: string;
  /** Wei the user can take back with withdraw_credit, when the call was refused. */
  credit?: string;
};

const ONE = BigInt(10) ** BigInt(18);
const fmt = (wei: bigint) => {
  const whole = wei / ONE;
  const frac = (wei % ONE).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : `${whole}`;
};

export type BondSeen = { provider: string; bond: string } | null;

/** After open_bond: did a bond with this id appear, posted by this account? */
export function openOutcome(
  bond: BondSeen,
  me: string,
  creditBefore: bigint,
  creditAfter: bigint,
  sent: bigint,
): Outcome {
  if (bond && bond.provider.toLowerCase() === me.toLowerCase()) {
    return { verdict: "done", title: "Bond posted", detail: `${fmt(BigInt(bond.bond))} GEN is escrowed under the rubric you wrote.` };
  }
  if (creditAfter - creditBefore >= sent && sent > BigInt(0)) {
    return {
      verdict: "refused",
      title: "The bond was NOT posted",
      detail: `The contract refused it and kept your ${fmt(sent)} GEN as a credit. Take it back with "take it back".`,
      credit: (creditAfter - creditBefore).toString(),
    };
  }
  if (bond) {
    return { verdict: "refused", title: "The bond was NOT posted", detail: "A bond with this id already belongs to another account." };
  }
  return {
    verdict: "pending",
    title: "Waiting for the chain",
    detail: "The transaction is accepted but neither the bond nor a credit is visible yet. Refresh after finalization.",
  };
}

/** After deliver: did the delivery count go up? (A refused delivery reverts, so this is a read check.) */
export function deliverOutcome(deliveredBefore: number, deliveredAfter: number): Outcome {
  return deliveredAfter > deliveredBefore
    ? { verdict: "done", title: "Delivery frozen", detail: "The page is stored whole on chain; scoring reads only that text." }
    : { verdict: "pending", title: "Waiting for the chain", detail: "The delivery is not visible yet. Refresh after finalization." };
}

export type RoundSeen = { finding: string; outcome: string; reason: string; score: number; round: number } | null;

/** After score: say what the round did. A round with no score is kept as evidence, not an error. */
export function roundOutcome(roundsBefore: number, round: RoundSeen): Outcome {
  if (!round || round.round <= roundsBefore) {
    return { verdict: "pending", title: "Waiting for the chain", detail: "The round is not visible yet. Refresh after finalization." };
  }
  if (round.outcome === "final") {
    return { verdict: "done", title: "Final score set", detail: `Enough rounds agreed: the median is the delivery's final score (this round read ${round.score}).` };
  }
  if (round.outcome === "counted") {
    return { verdict: "done", title: "Round counted", detail: `Validators scored this round ${round.score}/100; more rounds are still needed.` };
  }
  return {
    verdict: "refused",
    title: "The round produced no score",
    detail: `Validators could not score it${round.reason ? ` (${round.reason})` : ""}. The round is kept as evidence and counts for nothing.`,
  };
}

/** After settle: the bond must have left "open". */
export function settleOutcome(status: string): Outcome {
  if (status === "met") return { verdict: "done", title: "Bond MET", detail: "The total score reached the bar: the provider takes the bond back." };
  if (status === "breached") return { verdict: "done", title: "Bond BREACHED", detail: "The total score fell short: the client takes the bond." };
  return { verdict: "pending", title: "Waiting for the chain", detail: "The bond is not settled yet. Refresh after finalization." };
}

/** After withdraw: is the bond marked paid? */
export function withdrawOutcome(paid: boolean): Outcome {
  return paid
    ? { verdict: "done", title: "Bond paid", detail: "The bond is on its way to its owner; it lands when the transaction is finalized." }
    : { verdict: "pending", title: "Waiting for the chain", detail: "The bond is not marked paid yet. Refresh after finalization." };
}

/** After withdraw_credit: did the credit go to zero? */
export function creditOutcome(creditBefore: bigint, creditAfter: bigint): Outcome {
  if (creditBefore > BigInt(0) && creditAfter === BigInt(0)) {
    return { verdict: "done", title: "Credit withdrawn", detail: `${fmt(creditBefore)} GEN is on its way to your wallet; it lands when the transaction is finalized.` };
  }
  return { verdict: "pending", title: "Waiting for the chain", detail: "The credit is still shown. Refresh after finalization." };
}
