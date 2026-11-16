# Milestone v2: validators agree on whether a score reaches the bar; every promised delivery must pass

**What changed since the accepted project.** In the accepted ScoreBond, validators agreed on a score only
within a spread of 10 points, and a bond was settled by comparing the *sum* of the scores with `bar × deliveries`.
Two honest readings, 69 and 71, could land on different sides of the bar and decide who got the bond, and one
strong delivery could cover a failed one. v2 closes both, and moves the contract to the runner Studio Dev
accepts today (the old deployment stopped answering reads).

| | |
|---|---|
| Base (accepted) | `8bc527acc6a65e90bd7dd095f73fd421c335d118` |
| Code diff | `https://github.com/valentinzubok/ScoreBond/compare/8bc527acc6a65e90bd7dd095f73fd421c335d118...milestone-v2` |
| New deployment | [`0x6Cd9CdA209dc5f6784a4B2A3327baFF72B7b728E`](https://explorer-studio-dev.genlayer.com/address/0x6Cd9CdA209dc5f6784a4B2A3327baFF72B7b728E) — code sha256 `501ef58c…b80b2`, equal to `contracts/ScoreBond.py` (CI) |
| On-chain run | [`STUDIO_DEV_DEPLOY.md`](../STUDIO_DEV_DEPLOY.md): 31 transactions, 12 of them refused by design, 6 GEN of bonds settled, 1.5 GEN credit returned |
| Tests | [`tests/test_scorebond.py`](../tests/test_scorebond.py): 92 in total (8 new for v2); `genvm-lint` clean in CI |

## New contract functionality

- **Validators must agree on `passes`.** A round's answer is `{finding, score, passes}`; `passes` is "the score
  reaches the bar". Scores on opposite sides of the bar are a disagreement: the round reverts and records nothing,
  and is sent again. The 10-point spread allowed on the score itself can no longer move a bond.
- **The contract re-checks the agreed answer** after consensus: `passes == (score >= bar)`, otherwise the call
  fails.
- **Settlement counts deliveries that reached the bar** (`passed` against `passes_required`), not a sum of scores.
  Every promised delivery must pass; a delivery that never came cannot pass; one strong delivery cannot cover a
  failed one. `get_bond` now reports `passed` and `passes_required`.
- **Every round keeps `passes`** next to the score, the page hash and the injection flags (`get_round`).
- Header: the runner Studio Dev accepts today.

## What it closes

- **A bond decided by a few points** — shown in `breach-1` of the new run: one delivery read 100, 100, 100 and
  one read 10, 15, 15; `passed` 1 of 2 → BREACHED.
- **A sum that hides a failed delivery.**
- **An unreadable deployment.**

## What was deliberately not changed

No owner, no setters, the rubric and the bar fixed at opening, the frozen page (3000 characters), the median of an
odd number of rounds, the final deadline split (`score` and `settle` before it, `expire` at or after it), the
payable pattern that credits what it refuses, the paged registry with no cap.

## How it was checked

92 unit tests, including the exact boundary at the bar, a pair of scores on opposite sides of it, a forged
consensus answer whose `passes` contradicts its score, and several deliveries that must each reach the bar; the
linter (`lint`, `check`, `typecheck`) in CI; the 31-transaction run with the deployed code compared byte for byte
with the repository.
