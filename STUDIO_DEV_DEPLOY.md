# ScoreBond — Studio Dev (chain 61997) deploy record

| | |
|---|---|
| **Network** | GenLayer Studio Dev / Studio Next — chain `61997` |
| **Contract** | [`0x6876d2E31a3fC15651D7e826dFeE430f1cD942AF`](https://explorer-studio-dev.genlayer.com/address/0x6876d2E31a3fC15651D7e826dFeE430f1cD942AF) |
| **Deploy tx** | [`0xd4fab225…ab00550`](https://explorer-studio-dev.genlayer.com/tx/0xd4fab225e7f6cdc6e64cbe953767eb4fba6adba26b8394f1bf75e2743ab00550) from `0x057CF40AF02D68e221c90f11d51a34114B7EBf2c`, which has no role in the contract |
| **Source** | [`contracts/ScoreBond.py`](contracts/ScoreBond.py) — runner `py-genlayer:babwp9t37jw9g4j2bccgn14g6x7x9s1f7dsmh7emvz735pz4zxa0` |
| **Source sha256** | `a7b83c51adc1e708b0ad41cdd98d5cb444379c1965c7306574e8e928d9fa965b` |

This is version 2. Version 1 (`0xb68d…`) is kept as [`docs/STUDIO_DEV_DEPLOY_v1.md`](docs/STUDIO_DEV_DEPLOY_v1.md).

## What changed from v1

A steward pointed out that validators agreed on a score only within 10 points, so two honest
readings 69 and 71 could land on different sides of the bar and move the whole bond. v2 closes that:

* Validators must **agree on `passes`** (does the score reach the bar). A pair of scores on opposite
  sides of the bar is a disagreement; the round reverts and records nothing.
* The contract re-checks `passes == (score >= bar)` after consensus.
* Settlement counts **deliveries that reached the bar** (`passed` against `passes_required`), not a
  sum of scores, so one strong delivery cannot cover a failed one.

## Verify the source yourself

```bash
curl -s -X POST https://studio-dev.genlayer.com/api -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"gen_getContractCode","params":["0x6876d2E31a3fC15651D7e826dFeE430f1cD942AF"]}' \
  | python3 -c "import sys,json,base64,hashlib; print(hashlib.sha256(base64.b64decode(json.load(sys.stdin)['result'])).hexdigest())"
shasum -a 256 contracts/ScoreBond.py
# both print a7b83c51adc1e708b0ad41cdd98d5cb444379c1965c7306574e8e928d9fa965b
```

CI runs the same comparison on every push (`scripts/verify_deployment.py`).

## Lint

`sh scripts/lint_current_sdk.sh` — `genvm-lint lint` on the file as deployed, then `check` and `typecheck`
on a copy whose header uses the runner bundled with the public linter (`1jb45aa8…`); the linter cannot
yet download the current runner. The contract body is byte-identical. Passed, in CI.

## The run

Accounts (throwaway test keys): provider `0x4C1899C411B856296613c99aB9e68a8C9eF52EB8`, client
`0xb4faB94977048d3DFEf900E300745506B6252cEC`, stranger `0xA1bbb7Bc6cA793c891F6f1B6a74829fB2bDa90AE`.
Delivery pages are files of this repository, read from `raw.githubusercontent.com`. All of it ran on
2026-11-16 as one script; every call is below, including the refused ones.

| # | Call | Sender | Result | What happened | Tx |
|---|------|--------|--------|---------------|----|
| 1 | `open_bond(met-1)` value 2 GEN | provider | SUCCESS | `met-1`: 2 GEN, bar 70, 1 delivery, 1 scoring round, delivery window 300 s | [`0x0a28d688…4dcae1`](https://explorer-studio-dev.genlayer.com/tx/0x0a28d6886b39be72c7e6784abacbbedaedb7be225297904b279d27e1e14dcae1) |
| 2 | `open_bond(breach-1)` value 3 GEN | provider | SUCCESS | `breach-1`: 3 GEN, bar 70, 2 deliveries (both must pass), 3 scoring rounds each, interval 60 s | [`0xf4b179fd…3b0d47`](https://explorer-studio-dev.genlayer.com/tx/0xf4b179fdd40c0e461e7920d41c2a208049c48e5b8fd56361c5b8c1d1df3b0d47) |
| 3 | `open_bond(dl-1)` value 1 GEN | provider | SUCCESS | `dl-1`: 1 GEN, short windows (delivery 120 s, final deadline +180 s), for the deadline boundary | [`0x4eaa4851…84837b`](https://explorer-studio-dev.genlayer.com/tx/0x4eaa4851af2d5cdae3a0fc2a170ecac55c6da1546560c4d214e179774884837b) |
| 4 | `open_bond(dust-1)` value 0.5 GEN | provider | SUCCESS | `dust-1`: 0.5 GEN, below the 1 GEN minimum: not escrowed, credited | [`0xa695da5d…78cdb9`](https://explorer-studio-dev.genlayer.com/tx/0xa695da5deeef1f03bf777041f07bd442c944b70722dd066999d9b050d678cdb9) |
| 5 | `open_bond(self-1)` value 1 GEN | provider | SUCCESS | `self-1`: client = provider: not escrowed, 1 GEN credited | [`0x6b6550ee…fd2c25`](https://explorer-studio-dev.genlayer.com/tx/0x6b6550ee8fc0e70f96b74884a5c9dcb2a9c75bf173cde325e0723de49bfd2c25) |
| 6 | `deliver(met-1)` | stranger | **ERROR** | `deliver(met-1)` by a stranger: **UserError** `only the provider may deliver` | [`0x847f003e…fea65a`](https://explorer-studio-dev.genlayer.com/tx/0x847f003e6035fe5781f98d7f15f9511a7b3b74c209cdddca0c3f3a96aafea65a) |
| 7 | `deliver(dl-1)` | provider | SUCCESS | `dl-1` delivery frozen (`good-guide.md`) | [`0x3ad62f32…fe559a`](https://explorer-studio-dev.genlayer.com/tx/0x3ad62f32e1ade8ef1d399e3db75bb1f6d88b3d46660ee7fb682e72a3adfe559a) |
| 8 | `expire(dl-1)` | stranger | **ERROR** | `expire(dl-1)` before the final deadline: **UserError** `the final deadline has not passed; expiry opens at 1794844905` | [`0x7b5e0851…9bc7ca`](https://explorer-studio-dev.genlayer.com/tx/0x7b5e085104feb1043087e3096d708ce6ef3e74e8cf725d39b4eb4b4f619bc7ca) |
| 9 | `deliver(met-1)` | provider | **ERROR** | `long.md`: **UserError** `the delivery page has 6355 chars; at most 3000 so validators read all of it` | [`0x8878572c…674bff`](https://explorer-studio-dev.genlayer.com/tx/0x8878572cfd0b20d7e749211880f27c72787cab06e9400bdcc4794483ec674bff) |
| 10 | `deliver(met-1)` | provider | SUCCESS | `met-1` delivery 1 frozen: `good-guide.md`, 750 characters, sha-256 `cd6a853d…` | [`0x40e193d8…2eb53e`](https://explorer-studio-dev.genlayer.com/tx/0x40e193d8775a39a32b36db6b5ff61f90362ec64d1aa66e1ca4e8413b7f2eb53e) |
| 11 | `deliver(breach-1)` | provider | SUCCESS | `breach-1` delivery 1 frozen: `good-guide.md` | [`0xe8a1dfad…4a6d18`](https://explorer-studio-dev.genlayer.com/tx/0xe8a1dfadd75ab6405dda4fb29486be15ddf684cf2bb0754ce826e1ef4a4a6d18) |
| 12 | `deliver(breach-1)` | provider | SUCCESS | `breach-1` delivery 2 frozen: `thin-guide.md` (86 characters, sha-256 `6d09f323…`) | [`0xff71c17a…1141ac`](https://explorer-studio-dev.genlayer.com/tx/0xff71c17a9e836b1e681398de0119b081d432ec487411d8ee0dd1cfd7341141ac) |
| 13 | `settle(breach-1)` | stranger | **ERROR** | `settle(breach-1)` before anything is scored: **UserError** `delivery 1 is not scored yet` | [`0x334444c4…0507b0`](https://explorer-studio-dev.genlayer.com/tx/0x334444c46f9248840a98dadeb1424c1851ddbf9e306930c194e657d15c0507b0) |
| 14 | `score(met-1, 1)` | stranger | SUCCESS | `met-1` delivery 1, round 1 (15:58:32 UTC): scored 100, `passes` true → final score 100 | [`0x0f78dd74…0746cc`](https://explorer-studio-dev.genlayer.com/tx/0x0f78dd74b2dd5843bd516698246ae251f2d64e27ac34f48b26ac4d4f360746cc) |
| 15 | `settle(met-1)` | stranger | SUCCESS | `settle(met-1)`: 1 of 1 deliveries reached the bar → **MET**, beneficiary the provider | [`0x8d4b8d5b…4b65bf`](https://explorer-studio-dev.genlayer.com/tx/0x8d4b8d5bfcce4e15fff0d88b967ebfb36c6b81c43a1e71227cc3dc071b4b65bf) |
| 16 | `withdraw(met-1)` | client | **ERROR** | `withdraw(met-1)` by the client: **UserError** `only the party the outcome names may withdraw` | [`0x462e8ca9…eef57a`](https://explorer-studio-dev.genlayer.com/tx/0x462e8ca9f7f42772f18402381603fe6e13555055bb69563ac1188aec8eeef57a) |
| 17 | `withdraw(met-1)` | provider | SUCCESS | the provider takes the 2 GEN bond back | [`0xe1f72fb5…6b7079`](https://explorer-studio-dev.genlayer.com/tx/0xe1f72fb5eb4261158f2af087a79fd337c435365719c34189d899c582036b7079) |
| 18 | `score(breach-1, 1)` | stranger | SUCCESS | `breach-1` delivery 1, round 1 (16:01:01 UTC): scored 100 | [`0x71d75e0c…a603d2`](https://explorer-studio-dev.genlayer.com/tx/0x71d75e0c222d821241171cc34669292dbbc287c446c6e12c2b6ed36a79a603d2) |
| 19 | `score(breach-1, 2)` | stranger | SUCCESS | `breach-1` delivery 2, round 1 (16:02:28 UTC): scored 8, `passes` false | [`0x049f693e…a5681d`](https://explorer-studio-dev.genlayer.com/tx/0x049f693e1dad8786000c1840f4579865583353abfac5d53a0a3981544da5681d) |
| 20 | `score(breach-1, 1)` | stranger | SUCCESS | `breach-1` delivery 1, round 2 (16:02:52 UTC): scored 100 | [`0x4e18ec9e…a6aad8`](https://explorer-studio-dev.genlayer.com/tx/0x4e18ec9e8de50b44242628c9c731f132f8e552df1c71a82d0b774d94b3a6aad8) |
| 21 | `score(breach-1, 2)` | stranger | SUCCESS | `breach-1` delivery 2, round 2 (16:03:34 UTC): scored 15, `passes` false | [`0x2517e594…6c478a`](https://explorer-studio-dev.genlayer.com/tx/0x2517e5949d28a6a47a34a55e7510eaad1a76fa15e23c8baeed82ca301b6c478a) |
| 22 | `score(breach-1, 1)` | stranger | SUCCESS | `breach-1` delivery 1, round 3 (16:04:14 UTC): scored 95 → final score 100 (median of 100, 100, 95) | [`0xbdaae7c0…3e9d8b`](https://explorer-studio-dev.genlayer.com/tx/0xbdaae7c0371e1c5518e7bd7bcabc2fcc8b7a6a09ea6652a086e8e6b3733e9d8b) |
| 23 | `score(breach-1, 2)` | stranger | SUCCESS | `breach-1` delivery 2, round 3 (16:04:54 UTC): scored 10 → final score 10 (median of 8, 15, 10) | [`0x84c4e39c…d5a866`](https://explorer-studio-dev.genlayer.com/tx/0x84c4e39cdcc4b83621a1818403d0bf8d679820813ff7235e9cd7931820d5a866) |
| 24 | `settle(breach-1)` | stranger | SUCCESS | `settle(breach-1)`: 1 of 2 deliveries reached the bar (needed 2) → **BREACHED**, beneficiary the client | [`0xc07c5133…03abde`](https://explorer-studio-dev.genlayer.com/tx/0xc07c513381084e760ca1397c85bdac2e4a2cb61d3228a87e865461a5ca03abde) |
| 25 | `withdraw(breach-1)` | provider | **ERROR** | `withdraw(breach-1)` by the provider: **UserError** `only the party the outcome names may withdraw` | [`0xcda961f9…96e385`](https://explorer-studio-dev.genlayer.com/tx/0xcda961f9c3dc68333ddcc46d230d20daa14113ec30a10b8017891e536296e385) |
| 26 | `withdraw(breach-1)` | client | SUCCESS | the client takes the 3 GEN bond | [`0x981b2dbd…5d7cb2`](https://explorer-studio-dev.genlayer.com/tx/0x981b2dbd9093213ef1bc99f9ce55711e893bdddee09a5be05e6cedaab25d7cb2) |
| 27 | `score(dl-1, 1)` | stranger | **ERROR** | `score(dl-1, 1)` after the final deadline: **UserError** `the final deadline has passed at 1794844905; only expire is accepted` | [`0x31a59e5b…2d0fec`](https://explorer-studio-dev.genlayer.com/tx/0x31a59e5b41d67ab5d34acc106b62519d064953fc4d3213d3f0b00947a92d0fec) |
| 28 | `settle(dl-1)` | stranger | **ERROR** | `settle(dl-1)` after the final deadline: **UserError** `the final deadline has passed at 1794844905; only expire is accepted` | [`0x103e9d11…3227d2`](https://explorer-studio-dev.genlayer.com/tx/0x103e9d111101ebfb5430bfccabf25ba4722f42bbf51c4b6cfa3df74d0e3227d2) |
| 29 | `expire(dl-1)` | stranger | SUCCESS | `expire(dl-1)` → VOID (the delivery was never scored) | [`0x62cedfe7…3a3c3d`](https://explorer-studio-dev.genlayer.com/tx/0x62cedfe787035fc02b86f32be7bb0f39ae0302357f51a3885f6a6e56f83a3c3d) |
| 30 | `withdraw(dl-1)` | provider | SUCCESS | the provider takes the unscored 1 GEN bond back | [`0x730b8552…8ec980`](https://explorer-studio-dev.genlayer.com/tx/0x730b8552f94b888aec30cb8fa9f57d2d9c9f930c606a4281a9814703168ec980) |
| 31 | `withdraw_credit()` | provider | SUCCESS | credit from the two refused bonds: 1.5 GEN | [`0x16ddb996…670f93`](https://explorer-studio-dev.genlayer.com/tx/0x16ddb996e7b688af4b6f415b96c2dbe94735fed77dc4c144753ca95cdc670f93) |

### What the run shows

* **The sums are the contract's.** `met-1`: one reading, 100, bar 70 → MET. `breach-1`: delivery 1 read
  100, 100, 95 (median 100); delivery 2, the one-line guide, read 8, 15, 10 (median 10). Only 1 of the 2
  deliveries reached the bar, so the bond is BREACHED and the client took the 3 GEN.
* **The median is computed in code.** Every reading is kept by `get_round` with the page hash, the
  `passes` flag and injection flags.
* **The final deadline splits time in two.** On `dl-1`: `expire` before the deadline, and `score` and
  `settle` after it, are each refused with their own message; `expire` then works.
* **Guards.** A stranger cannot deliver; an oversized page is refused; `settle` waits for every delivery
  to be scored; each party can collect only what the outcome names.
* **Money.** 6 GEN of bonds (2 + 3 + 1) and 1.5 GEN of refused value came in; the same 6 GEN of bonds and
  1.5 GEN of credit went out; the contract holds 0 (`get_balance` → `{"balance":"0","credits":"0","held":"0"}`).

### What this run did not show

* **A round on which validators disagree.** In this run every scoring round was recorded on the first
  try, so the "reverts and is sent again" path was not exercised on chain. It is covered by unit tests
  (forced disagreements in `tests/test_scorebond.py`, including a pair of scores on
  opposite sides of the bar).
* The refusal messages of `dust-1` and `self-1` are returned in the call result, which the script did not
  log; their credit (1.5 GEN, tx 31) is read from chain. The reasons are covered by
  `test_a_refused_bond_never_raises_and_credits_everything`.
* A page that validators judge **unscorable**, an out-of-range score and a forged consensus answer are
  covered by unit tests; a model cannot be made to fail on demand.
* The 260-bond registry and event paging are covered by unit tests, not by 260 transactions.
