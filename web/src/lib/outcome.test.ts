import { describe, expect, it } from "vitest";
import { creditOutcome, deliverOutcome, openOutcome, roundOutcome, settleOutcome, withdrawOutcome } from "./outcome";

const ME = "0xAbC0000000000000000000000000000000000001";
const GEN = BigInt(10) ** BigInt(18);

describe("open_bond", () => {
  it("reports success only when the bond exists and is ours", () => {
    const o = openOutcome({ provider: ME.toLowerCase(), bond: (BigInt(4) * GEN).toString() }, ME, BigInt(0), BigInt(0), BigInt(4) * GEN);
    expect(o.verdict).toBe("done");
    expect(o.detail).toContain("4 GEN");
  });
  it("an accepted but refused bond is reported as refused, with the credit", () => {
    const o = openOutcome(null, ME, BigInt(0), BigInt(4) * GEN, BigInt(4) * GEN);
    expect(o.verdict).toBe("refused");
    expect(o.title).toContain("NOT posted");
    expect(o.credit).toBe((BigInt(4) * GEN).toString());
  });
  it("an id taken by someone else is not a success", () => {
    const o = openOutcome({ provider: "0x0000000000000000000000000000000000000002", bond: "1" }, ME, BigInt(0), BigInt(0), GEN);
    expect(o.verdict).toBe("refused");
    expect(o.detail).toContain("another account");
  });
  it("before finalization nothing is claimed", () => {
    expect(openOutcome(null, ME, BigInt(0), BigInt(0), GEN).verdict).toBe("pending");
  });
  it("a credit that was already there is not mistaken for a new refusal", () => {
    expect(openOutcome(null, ME, GEN, GEN, GEN).verdict).toBe("pending");
  });
});

describe("deliver", () => {
  it("counts only when the delivery count went up", () => {
    expect(deliverOutcome(0, 1).verdict).toBe("done");
    expect(deliverOutcome(1, 1).verdict).toBe("pending");
  });
});

describe("score rounds", () => {
  const r = (outcome: string, score = 80, reason = "") => ({ finding: outcome === "no_score" ? "unscored" : "scored", outcome, reason, score, round: 2 });
  it("a final round names the median as the final score", () => {
    expect(roundOutcome(1, r("final")).title).toBe("Final score set");
  });
  it("a counted round says more are needed", () => {
    const o = roundOutcome(1, r("counted", 64));
    expect(o.verdict).toBe("done");
    expect(o.detail).toContain("64/100");
  });
  it("a round without a score is reported as such, with the reason", () => {
    const o = roundOutcome(1, r("no_score", -1, "bad_score"));
    expect(o.verdict).toBe("refused");
    expect(o.detail).toContain("bad_score");
  });
  it("no new round yet is pending", () => {
    expect(roundOutcome(2, r("final")).verdict).toBe("pending");
    expect(roundOutcome(0, null).verdict).toBe("pending");
  });
});

describe("settle, withdraw, credit", () => {
  it("names who is owed the bond", () => {
    expect(settleOutcome("met").detail).toContain("provider");
    expect(settleOutcome("breached").detail).toContain("client");
    expect(settleOutcome("open").verdict).toBe("pending");
  });
  it("a bond counts as paid only when the chain marks it", () => {
    expect(withdrawOutcome(true).verdict).toBe("done");
    expect(withdrawOutcome(false).verdict).toBe("pending");
  });
  it("a credit counts as withdrawn only when it went to zero", () => {
    expect(creditOutcome(GEN, BigInt(0)).verdict).toBe("done");
    expect(creditOutcome(GEN, GEN).verdict).toBe("pending");
    expect(creditOutcome(BigInt(0), BigInt(0)).verdict).toBe("pending");
  });
});
