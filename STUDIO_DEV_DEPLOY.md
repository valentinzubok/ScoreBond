# ScoreBond — Studio Dev (chain 61997) deploy record

| | |
|---|---|
| **Network** | GenLayer Studio Dev / Studio Next — chain `61997` |
| **Contract** | [`0x6Cd9CdA209dc5f6784a4B2A3327baFF72B7b728E`](https://explorer-studio-dev.genlayer.com/address/0x6Cd9CdA209dc5f6784a4B2A3327baFF72B7b728E) |
| **Deploy tx** | [`0xe88d21b7…364c3e`](https://explorer-studio-dev.genlayer.com/tx/0xe88d21b7843a176fbdd203217c047c88eb32d4c3d5de9fcb3e722c30a6364c3e) from `0x057CF40AF02D68e221c90f11d51a34114B7EBf2c`, which has no role in the contract |
| **Source** | [`contracts/ScoreBond.py`](contracts/ScoreBond.py) — runner `py-genlayer:kzybg95x1gn21dw72m7hyg0maaap04n4nx55j9yt6fkdqxtz6bz0` |
| **Source sha256** | `501ef58c2fc95272a0fbd053969c639848de00b601a360316e23f649c5eb80b2` |

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
  -d '{"jsonrpc":"2.0","id":1,"method":"gen_getContractCode","params":["0x6Cd9CdA209dc5f6784a4B2A3327baFF72B7b728E"]}' \
  | python3 -c "import sys,json,base64,hashlib; print(hashlib.sha256(base64.b64decode(json.load(sys.stdin)['result'])).hexdigest())"
shasum -a 256 contracts/ScoreBond.py
# both print 501ef58c2fc95272a0fbd053969c639848de00b601a360316e23f649c5eb80b2
```

CI runs the same comparison on every push (`scripts/verify_deployment.py`).

## Runner

On 2026-11-16 Studio Dev moved to GenVM v0.4 and stopped answering reads for contracts on the earlier runner
(`invalid_contract runner malformed`). This is the same contract source, redeployed with the current
runner from the [official runners page](https://sdk.genlayer.com/main/executors/v0.4/python-sdk/available-runners.html):
`py-genlayer:kzybg95x1gn21dw72m7hyg0maaap04n4nx55j9yt6fkdqxtz6bz0` (the `# v0.3.0` header line is unchanged
and accepted). The earlier deployment `0x6876d2E31a3fC15651D7e826dFeE430f1cD942AF` is no longer readable.

## Lint

`sh scripts/lint_current_sdk.sh` — `genvm-lint lint` on the file as deployed, then `check` and `typecheck`
on a copy whose header uses the runner bundled with the public linter (`1jb45aa8…`); the linter cannot
yet download the v0.4 runner. The contract body is byte-identical. Passed, in CI.

## The run

Accounts (throwaway test keys): provider `0x4C1899C411B856296613c99aB9e68a8C9eF52EB8`, client
`0xb4faB94977048d3DFEf900E300745506B6252cEC`, stranger `0xA1bbb7Bc6cA793c891F6f1B6a74829fB2bDa90AE`.
Delivery pages are files of this repository, read from `raw.githubusercontent.com`. All of it ran on
2026-11-16 as one script; every call is below, including the refused ones.

| # | Call | Sender | Result | What happened | Tx |
|---|------|--------|--------|---------------|----|
| 1 | `open_bond(met-1)` value 2 GEN | provider | SUCCESS | `met-1`: 2 GEN, bar 70, 1 delivery, 1 scoring round, delivery window 300 s | [`0x43cd8973…345fb5`](https://explorer-studio-dev.genlayer.com/tx/0x43cd89734943019666e7fea2c171ebba5517b4e753f2b2c953befea5d9345fb5) |
| 2 | `open_bond(breach-1)` value 3 GEN | provider | SUCCESS | `breach-1`: 3 GEN, bar 70, 2 deliveries (both must pass), 3 scoring rounds each, interval 60 s | [`0xbb701b9a…ee0c04`](https://explorer-studio-dev.genlayer.com/tx/0xbb701b9a5ebcb148f7466731d2ef496fc3c8ff5a07eca19c25d5aa20d9ee0c04) |
| 3 | `open_bond(dl-1)` value 1 GEN | provider | SUCCESS | `dl-1`: 1 GEN, short windows (delivery 120 s, final deadline +180 s), for the deadline boundary | [`0xd060baa0…aee6f5`](https://explorer-studio-dev.genlayer.com/tx/0xd060baa03c4355a57b15a45ae570237d6d828cb505fb7d005a2046dff9aee6f5) |
| 4 | `open_bond(dust-1)` value 0.5 GEN | provider | SUCCESS | `dust-1`: 0.5 GEN, below the 1 GEN minimum: not escrowed, credited | [`0x9191d66c…a577af`](https://explorer-studio-dev.genlayer.com/tx/0x9191d66c7ff24cba72ca26deb0325a1b256970061216670768e3f76972a577af) |
| 5 | `open_bond(self-1)` value 1 GEN | provider | SUCCESS | `self-1`: client = provider: not escrowed, 1 GEN credited | [`0xf401be4a…7bbf96`](https://explorer-studio-dev.genlayer.com/tx/0xf401be4a0367c20433016b89d8e12c77aa7fe000e634440943481743957bbf96) |
| 6 | `deliver(met-1)` | stranger | **ERROR** | `deliver(met-1)` by a stranger: **UserError** `only the provider may deliver` | [`0x59e1c8eb…d9783b`](https://explorer-studio-dev.genlayer.com/tx/0x59e1c8ebe7a9de4bdda80dabaeef7e17f008d1582aead9a47c27ffff69d9783b) |
| 7 | `deliver(dl-1)` | provider | SUCCESS | `dl-1` delivery frozen (`good-guide.md`) | [`0xd56765a9…3fd4ca`](https://explorer-studio-dev.genlayer.com/tx/0xd56765a9f950702e91ead3635f1d215657624a39c67dff770dc974b01b3fd4ca) |
| 8 | `expire(dl-1)` | stranger | **ERROR** | `expire(dl-1)` before the final deadline: **UserError** `the final deadline has not passed; expiry opens at 1794855427` | [`0xfccb116f…e986ee`](https://explorer-studio-dev.genlayer.com/tx/0xfccb116f50b0f8d30ea6cd16312c6af1c7bad65faf6a7127da70430097e986ee) |
| 9 | `deliver(met-1)` | provider | **ERROR** | `long.md`: **UserError** `the delivery page has 6355 chars; at most 3000 so validators read all of it` | [`0x67517a0f…d48c0f`](https://explorer-studio-dev.genlayer.com/tx/0x67517a0ff7bd940b3450b04d0c8777fc9706801acbf8167eb4e4fe928ed48c0f) |
| 10 | `deliver(met-1)` | provider | SUCCESS | `met-1` delivery 1 frozen: `good-guide.md`, 750 characters, sha-256 `cd6a853d…` | [`0x1580bec5…83e513`](https://explorer-studio-dev.genlayer.com/tx/0x1580bec52d9a94539da553e9947fbd5ce0befbf56be8dc8eb829115f9483e513) |
| 11 | `deliver(breach-1)` | provider | SUCCESS | `breach-1` delivery 1 frozen: `good-guide.md` | [`0xa1ef6994…27e5f7`](https://explorer-studio-dev.genlayer.com/tx/0xa1ef6994cfd727f82ec9b70f0e896cec84bde38bc18c10d01f296c751027e5f7) |
| 12 | `deliver(breach-1)` | provider | SUCCESS | `breach-1` delivery 2 frozen: `thin-guide.md` (86 characters, sha-256 `6d09f323…`) | [`0x611eaab9…4da829`](https://explorer-studio-dev.genlayer.com/tx/0x611eaab96642edf12399d90d9e7e39fe87caa85a9ac5155f44378e383d4da829) |
| 13 | `settle(breach-1)` | stranger | **ERROR** | `settle(breach-1)` before anything is scored: **UserError** `delivery 1 is not scored yet` | [`0xaf9ccefc…312437`](https://explorer-studio-dev.genlayer.com/tx/0xaf9ccefc9f36f13fe073620a396ef5fb9ffcb44978befd3463e57eddbc312437) |
| 14 | `score(met-1, 1)` | stranger | SUCCESS | `met-1` delivery 1, round 1 (18:53:54 UTC): scored 100, `passes` true → final score 100 | [`0xced6207f…6c4141`](https://explorer-studio-dev.genlayer.com/tx/0xced6207f52b4f3f7d19edb51ce11b4de2c8d06631f2bb6aa1994c04a066c4141) |
| 15 | `settle(met-1)` | stranger | SUCCESS | `settle(met-1)`: 1 of 1 deliveries reached the bar → **MET**, beneficiary the provider | [`0x15a9541d…8fb466`](https://explorer-studio-dev.genlayer.com/tx/0x15a9541df5e41db23464354c1379841a18a93b69f45a810d1fef63cb088fb466) |
| 16 | `withdraw(met-1)` | client | **ERROR** | `withdraw(met-1)` by the client: **UserError** `only the party the outcome names may withdraw` | [`0x2acac43a…b0c46c`](https://explorer-studio-dev.genlayer.com/tx/0x2acac43aaa0c36ef618c0153b0e697a74c9f21cbd4e2489bfc0a3d38bbb0c46c) |
| 17 | `withdraw(met-1)` | provider | SUCCESS | the provider takes the 2 GEN bond back | [`0x41dcb545…b5ee14`](https://explorer-studio-dev.genlayer.com/tx/0x41dcb545b085219e66ed8982cd69675b99715b3ccc3c20219568bdd66eb5ee14) |
| 18 | `score(breach-1, 1)` | stranger | SUCCESS | `breach-1` delivery 1, round 1 (18:56:28 UTC): scored 100 | [`0x2d32af57…fb80e0`](https://explorer-studio-dev.genlayer.com/tx/0x2d32af571a7f5a4240d535c06799a7e61568cb4424960739fa0a7c4e5efb80e0) |
| 19 | `score(breach-1, 2)` | stranger | SUCCESS | `breach-1` delivery 2, round 1 (18:56:50 UTC): scored 10, `passes` false | [`0xdd6deeb2…cf4fb7`](https://explorer-studio-dev.genlayer.com/tx/0xdd6deeb2dc8b17e4338878986ff14c38964bbb90ef8260ae2bea644ff7cf4fb7) |
| 20 | `score(breach-1, 1)` | stranger | SUCCESS | `breach-1` delivery 1, round 2 (18:57:33 UTC): scored 100 | [`0x2585accd…e54940`](https://explorer-studio-dev.genlayer.com/tx/0x2585accd59372d6ded9df773cbb30f09a39a7d2f036799c9da33cfcb47e54940) |
| 21 | `score(breach-1, 2)` | stranger | SUCCESS | `breach-1` delivery 2, round 2 (18:57:55 UTC): scored 15, `passes` false | [`0x2f2bfad7…a7db60`](https://explorer-studio-dev.genlayer.com/tx/0x2f2bfad7fab070902769e219b8d573b0b773bae353a23862a11452f34ba7db60) |
| 22 | `score(breach-1, 1)` | stranger | SUCCESS | `breach-1` delivery 1, round 3 (18:59:10 UTC): scored 100 → final score 100 (median of 100, 100, 100) | [`0xff12a975…f3f179`](https://explorer-studio-dev.genlayer.com/tx/0xff12a975f7e95f3918cb964544cdc66caa4486bfcec09c54d0e5ca88d8f3f179) |
| 23 | `score(breach-1, 2)` | stranger | SUCCESS | `breach-1` delivery 2, round 3 (18:59:36 UTC): scored 15 → final score 15 (median of 10, 15, 15) | [`0x45c53533…6c4a84`](https://explorer-studio-dev.genlayer.com/tx/0x45c5353369206aacc12e5026f20cc6f37cef7bcdd168fe38ab2d6153c16c4a84) |
| 24 | `settle(breach-1)` | stranger | SUCCESS | `settle(breach-1)`: 1 of 2 deliveries reached the bar (needed 2) → **BREACHED**, beneficiary the client | [`0x860a323d…f310d0`](https://explorer-studio-dev.genlayer.com/tx/0x860a323d59ef2c74147df0580b2d6fec01f269f6f903ba355bca2e8a14f310d0) |
| 25 | `withdraw(breach-1)` | provider | **ERROR** | `withdraw(breach-1)` by the provider: **UserError** `only the party the outcome names may withdraw` | [`0x2a2da892…b3597d`](https://explorer-studio-dev.genlayer.com/tx/0x2a2da892b6a56d6542c4a94f61835027560c491e9515895a4017d9610db3597d) |
| 26 | `withdraw(breach-1)` | client | SUCCESS | the client takes the 3 GEN bond | [`0x6cd0a6fb…ccbffe`](https://explorer-studio-dev.genlayer.com/tx/0x6cd0a6fb364a1d35b37cbc84ed4f94c3b699f00e53c6b9edb8908cabc3ccbffe) |
| 27 | `score(dl-1, 1)` | stranger | **ERROR** | `score(dl-1, 1)` after the final deadline: **UserError** `the final deadline has passed at 1794855427; only expire is accepted` | [`0xaa051eac…8e1a5e`](https://explorer-studio-dev.genlayer.com/tx/0xaa051eac1426682f44c7ed4d9a52fe24936a5e3a3d425bb83bc2a904cb8e1a5e) |
| 28 | `settle(dl-1)` | stranger | **ERROR** | `settle(dl-1)` after the final deadline: **UserError** `the final deadline has passed at 1794855427; only expire is accepted` | [`0xc10f1d1f…26df5e`](https://explorer-studio-dev.genlayer.com/tx/0xc10f1d1f010fea0184fab126f7c68068e98b4a860180e36a6dbb57786c26df5e) |
| 29 | `expire(dl-1)` | stranger | SUCCESS | `expire(dl-1)` → VOID (the delivery was never scored) | [`0x0b70a609…79f8b2`](https://explorer-studio-dev.genlayer.com/tx/0x0b70a609db8eb904f619f6526156f18d81aff4e65b77f2859e0429384179f8b2) |
| 30 | `withdraw(dl-1)` | provider | SUCCESS | the provider takes the unscored 1 GEN bond back | [`0x02174710…66102d`](https://explorer-studio-dev.genlayer.com/tx/0x0217471095da4eb7492f40a278a0d283f6208e6d6c4689f5086f65d2c666102d) |
| 31 | `withdraw_credit()` | provider | SUCCESS | credit from the two refused bonds: 1.5 GEN | [`0x94a6ad38…d073de`](https://explorer-studio-dev.genlayer.com/tx/0x94a6ad38350a736d39b77aa8d8bd5f2de2f9273b63afc3a7e6a3f33667d073de) |

### What the run shows

* **The sums are the contract's.** `met-1`: one reading, 100, bar 70 → MET. `breach-1`: delivery 1 read
  100, 100, 100 (median 100); delivery 2, the one-line guide, read 10, 15, 15 (median 15). Only 1 of the 2
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
