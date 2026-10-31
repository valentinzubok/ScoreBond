# ScoreBond — Studio Dev (chain 61997) deploy record

| | |
|---|---|
| **Network** | GenLayer Studio Dev / Studio Next — chain `61997` |
| **Contract** | [`0xb68dC2fF071862504aC325EA9F0261db3B53Da1b`](https://explorer-studio-dev.genlayer.com/address/0xb68dC2fF071862504aC325EA9F0261db3B53Da1b) |
| **Deploy tx** | [`0x354b7330…0e4e51`](https://explorer-studio-dev.genlayer.com/tx/0x354b73308a0a21add6109dc94c592419f7e187b6fbc4021f2739c68cc80e4e51) from `0x5f1C2ba2119001151cc3942A7B7a284bE22565b9`, which has no role in the contract |
| **Source** | [`contracts/ScoreBond.py`](contracts/ScoreBond.py) — runner `py-genlayer:babwp9t37jw9g4j2bccgn14g6x7x9s1f7dsmh7emvz735pz4zxa0` |
| **Source sha256** | `0d18f4a81e8e88282827a9347ea40a8fa3b8de180a39a6f4fc214931a3767f59` |

## Verify the source yourself

```bash
curl -s -X POST https://studio-dev.genlayer.com/api -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"gen_getContractCode","params":["0xb68dC2fF071862504aC325EA9F0261db3B53Da1b"]}' \
  | python3 -c "import sys,json,base64,hashlib; print(hashlib.sha256(base64.b64decode(json.load(sys.stdin)['result'])).hexdigest())"
shasum -a 256 contracts/ScoreBond.py
# both print 0d18f4a81e8e88282827a9347ea40a8fa3b8de180a39a6f4fc214931a3767f59
```

CI runs the same comparison on every push (`scripts/verify_deployment.py`).

## Runner

Studio Dev stopped accepting the earlier runner `py-genlayer:5jycge4q8…` between 2026-10-20 and
2026-10-30. This contract uses the runner listed as current on the
[official runners page](https://sdk.genlayer.com/main/executors/v0.3/python-sdk/available-runners.html)
(GenVM v0.3.0-rc10).

## Lint

`sh scripts/lint_current_sdk.sh` — `genvm-lint lint` on the file as deployed, then `check` and `typecheck`
on a copy whose header uses the runner bundled with the public linter (`1jb45aa8…`, GenVM rc7); the
linter cannot yet download the rc10 runner. The contract body is byte-identical. Passed, in CI.

## The run

Accounts (throwaway test keys): provider `0x7Bc84179793406B9aB817255186AC7633CE00279`, client
`0xFC93eA9A607E50b9287317ff3A3ec86be47c693C`, stranger `0x3F1ba839a1Aff90015d958Ec0C1Dc897bB5C9bB0`.
Delivery pages are files of this repository, read from `raw.githubusercontent.com`. The run was
made in two parts (txs 1–26, then 27–39) because the first script's timings did not fit the network's
speed; nothing was edited between them.

| # | Call | Sender | Result | What happened | Tx |
|---|------|--------|--------|---------------|----|
| 1 | `open_bond(met-1)` value 2 GEN | provider | SUCCESS | `met-1`: 2 GEN, bar 70, 1 delivery, 1 scoring round, delivery window 300 s | [`0x065e6178…8ce883`](https://explorer-studio-dev.genlayer.com/tx/0x065e6178086b827222a140e215872e8e9e9ef409c3d3513b73471dd3fe8ce883) |
| 2 | `open_bond(breach-1)` value 3 GEN | provider | SUCCESS | `breach-1`: 3 GEN, bar 70, 2 deliveries, 3 scoring rounds each, interval 60 s | [`0x737855cf…b178ce`](https://explorer-studio-dev.genlayer.com/tx/0x737855cf8930baef61653633dcc33b0b89a32bcd345043abf4576c159cb178ce) |
| 3 | `open_bond(dl-1)` value 1 GEN | provider | SUCCESS | `dl-1`: 1 GEN, short windows (delivery 180 s, final deadline +180 s), for the deadline boundary | [`0x1781989e…95d139`](https://explorer-studio-dev.genlayer.com/tx/0x1781989ea3cc755a02c2b196a01780a811921bb6b8114644261265711b95d139) |
| 4 | `open_bond(dust-1)` value 0.5 GEN | provider | SUCCESS | `dust-1`: 0.5 GEN → refused in the return value (below the 1 GEN minimum), credited | [`0xe181dbd6…223e2e`](https://explorer-studio-dev.genlayer.com/tx/0xe181dbd6404eb7bae328f9d07c4d02f77ddcaabce915a6fe0263445c9d223e2e) |
| 5 | `open_bond(self-1)` value 1 GEN | provider | SUCCESS | `self-1`: client = provider → refused in the return value, 1 GEN credited | [`0x88f96e77…827cfe`](https://explorer-studio-dev.genlayer.com/tx/0x88f96e77fa82315e8aa885ecbfd5d4377518361f8b4758c2c4b739283d827cfe) |
| 6 | `deliver(met-1)` | stranger | **ERROR** | `deliver(met-1)` by a stranger: **UserError** `only the provider may deliver` | [`0x4c7e2c64…a72efa`](https://explorer-studio-dev.genlayer.com/tx/0x4c7e2c64d45117f4f724adc9cc78d1ea0e7e28c1c89d53d16063dabcb3a72efa) |
| 7 | `deliver(dl-1)` | provider | SUCCESS | `dl-1` delivery frozen (`good-guide.md`) | [`0x36bc7773…b75511`](https://explorer-studio-dev.genlayer.com/tx/0x36bc777326cbf8c191885ef34191488cca8d049fb8c43811a865be52a2b75511) |
| 8 | `expire(dl-1)` | stranger | **ERROR** | `expire(dl-1)` one step before the final deadline: **UserError** `the final deadline has not passed; expiry opens at 1793485159` | [`0xfaab79e1…a680e2`](https://explorer-studio-dev.genlayer.com/tx/0xfaab79e1343de8ff540ac4bcff630e82cc948c6051f627edca4669e3fda680e2) |
| 9 | `deliver(met-1)` | provider | **ERROR** | `long.md`: **UserError** `the delivery page has 6355 chars; at most 3000 so validators read all of it` | [`0x7678ea66…da0ace`](https://explorer-studio-dev.genlayer.com/tx/0x7678ea66c161ffa3a39105f4596de3fa4030e188632639aea0d31619d3da0ace) |
| 10 | `deliver(met-1)` | provider | SUCCESS | `met-1` delivery 1 frozen: `good-guide.md`, 750 characters, sha-256 `cd6a853d…` | [`0x43471989…c905b7`](https://explorer-studio-dev.genlayer.com/tx/0x43471989b4a1791503d1e43fd2c93d527ba95596146d4092e0bb8ddd11c905b7) |
| 11 | `deliver(breach-1)` | provider | SUCCESS | `breach-1` delivery 1 frozen: `good-guide.md` | [`0xa9369a16…ab3809`](https://explorer-studio-dev.genlayer.com/tx/0xa9369a164ff62a6089d0a0fed7838d5e6a8d83425757a611fc13f25b0dab3809) |
| 12 | `deliver(breach-1)` | provider | SUCCESS | `breach-1` delivery 2 frozen: `thin-guide.md` (86 characters) | [`0xa9c548ba…33e156`](https://explorer-studio-dev.genlayer.com/tx/0xa9c548ba05bb23737802c33810ec5661e9988d857c452176a7f83e4d1b33e156) |
| 13 | `score(met-1)` | stranger | SUCCESS | `score(met-1, 1)`: the leader ran, but the validators did not agree, so nothing was recorded (`get_round` → no such round). The contract fails closed | [`0x302922bb…2bc163`](https://explorer-studio-dev.genlayer.com/tx/0x302922bb7457f4d15e00ed048e10949ffedfe2bd0423af982e9d5c60472bc163) |
| 14 | `settle(breach-1)` | stranger | **ERROR** | `settle(breach-1)` before any delivery was scored: **UserError** `delivery 1 is not scored yet` | [`0x9fc5626b…6b9505`](https://explorer-studio-dev.genlayer.com/tx/0x9fc5626b2125aed1a1b5068f369bf1d55910b2d07c9784a0f53eb392af6b9505) |
| 15 | `score(breach-1)` | stranger | SUCCESS | `breach-1` delivery 1, round 1 (22:18:28 UTC): scored 100 | [`0xdf37bc0d…fd4dac`](https://explorer-studio-dev.genlayer.com/tx/0xdf37bc0dc0ec475faf569d582e09c3898e2e5557e00fb8bd16ab401d08fd4dac) |
| 16 | `score(breach-1)` | stranger | SUCCESS | `breach-1` delivery 2, round 1 (22:18:58 UTC): scored 7 | [`0x3cab7eb4…b9dc3c`](https://explorer-studio-dev.genlayer.com/tx/0x3cab7eb4fe6fdbabbee93aac08699051186ea484f7ab3b0bb929483c75b9dc3c) |
| 17 | `score(breach-1)` | stranger | SUCCESS | `breach-1` delivery 1, round 2 (22:19:35 UTC): scored 100 | [`0x5c6d58aa…203696`](https://explorer-studio-dev.genlayer.com/tx/0x5c6d58aa9ddfd624f033a08d7b728acec111cb5b2f4d2df1af2abe6532203696) |
| 18 | `score(breach-1)` | stranger | **ERROR** | delivery 1 again at once: **UserError** `the next round for this delivery opens at 1793485235` | [`0x0d2a4b89…df5a62`](https://explorer-studio-dev.genlayer.com/tx/0x0d2a4b89d631bc057b5398616c3f56f887bc4995d0592d76d2bc1ce0d4df5a62) |
| 19 | `score(breach-1)` | stranger | SUCCESS | `breach-1` delivery 2, round 2 (22:23:06 UTC): scored 8 | [`0x681deacc…4794b4`](https://explorer-studio-dev.genlayer.com/tx/0x681deacc8d7909a5da455e6424ae682458fbbea7922da632333435f21a4794b4) |
| 20 | `score(breach-1)` | stranger | SUCCESS | `breach-1` delivery 1, round 3 (22:22:22 UTC): scored 100 → final score 100 (median) | [`0xb3959306…458825`](https://explorer-studio-dev.genlayer.com/tx/0xb395930651eb5f3c03af33f3c9a8bf564b621676f2e880ca464980e630458825) |
| 21 | `score(breach-1)` | stranger | SUCCESS | `score(breach-1, 2)`: not recorded (no round 3 appears; consensus did not agree) | [`0x31488f1e…7d42ec`](https://explorer-studio-dev.genlayer.com/tx/0x31488f1e7a3b27ad3bfa4732dc580036c0ea367c7ac9634dc89970464b7d42ec) |
| 22 | `settle(met-1)` | stranger | **ERROR** | `settle(met-1)` while its delivery is unscored: **UserError** `delivery 1 is not scored yet` | [`0x0e769d50…dd9b00`](https://explorer-studio-dev.genlayer.com/tx/0x0e769d508b729970ac28d85a95a304a4c03259b8ec1ab71bf75f475699dd9b00) |
| 23 | `settle(breach-1)` | stranger | **ERROR** | `settle(breach-1)` while delivery 2 has two rounds: **UserError** `delivery 2 is not scored yet` | [`0xdc9f14eb…25f4dc`](https://explorer-studio-dev.genlayer.com/tx/0xdc9f14eb9e68dc5fb8bc62c7db7649a0ba4fb59e9829a991ba1b867b0325f4dc) |
| 24 | `withdraw(met-1)` | stranger | **ERROR** | `withdraw(met-1)` before settlement: **UserError** `the bond is not settled` | [`0x092f4638…0a8361`](https://explorer-studio-dev.genlayer.com/tx/0x092f4638ce52ae28a881be82a1d3a3a4301028241e26bc51185e0ad99b0a8361) |
| 25 | `withdraw(met-1)` | stranger | **ERROR** | same, from another account: **UserError** `the bond is not settled` | [`0x4fe9ba33…7f4da7`](https://explorer-studio-dev.genlayer.com/tx/0x4fe9ba337fba8a69633c393b75955bc6e9873cb5fb07fb2d69b368101f7f4da7) |
| 26 | `withdraw(breach-1)` | stranger | **ERROR** | `withdraw(breach-1)` before settlement: **UserError** `the bond is not settled` | [`0xdcc2d6fc…88e31a`](https://explorer-studio-dev.genlayer.com/tx/0xdcc2d6fcd7a74f7a0486dd19e6b7d0d9ea39ce37fd1a5fc612e1ac175288e31a) |
| 27 | `score(met-1)` | stranger | SUCCESS | `met-1` round 1 (22:25:17 UTC): scored 95 → final score 95 | [`0x0b81efb0…fdcd9f`](https://explorer-studio-dev.genlayer.com/tx/0x0b81efb0462839365b9687201dc14d67520cecc09a6e33c4788a1f35c3fdcd9f) |
| 28 | `settle(met-1)` | stranger | SUCCESS | `settle(met-1)`: total 95 ≥ 70 → **MET**, beneficiary the provider | [`0x5c9868b5…659513`](https://explorer-studio-dev.genlayer.com/tx/0x5c9868b53fdb0c2fac3eab915f9400b35a023e0b5e903f9cf3ba42e5d8659513) |
| 29 | `withdraw(met-1)` | client | **ERROR** | `withdraw(met-1)` by the client: **UserError** `only the party the outcome names may withdraw` | [`0xf3c880f9…821087`](https://explorer-studio-dev.genlayer.com/tx/0xf3c880f9ddcb3e3a066be87855eb2cce50339e4aa3cf9ac25eabed87da821087) |
| 30 | `withdraw(met-1)` | provider | SUCCESS | FINALIZED. the provider takes its 2 GEN back | [`0x3d549570…46af31`](https://explorer-studio-dev.genlayer.com/tx/0x3d549570dcf55cfceec73409d87713696a08114d430e726fab88c4791846af31) |
| 31 | `score(breach-1)` | stranger | SUCCESS | `breach-1` delivery 2, round 3: scored 8 → readings 7, 8, 8, final score 8 (median) | [`0x510e5add…be24d4`](https://explorer-studio-dev.genlayer.com/tx/0x510e5add2e902b94668147e8533dd74bf9e3284db630a305a21691422ebe24d4) |
| 32 | `settle(breach-1)` | stranger | SUCCESS | `settle(breach-1)`: total 100 + 8 = 108 < 70 × 2 = 140 → **BREACHED**, beneficiary the client | [`0xc281bcf5…44b430`](https://explorer-studio-dev.genlayer.com/tx/0xc281bcf5b5127db70fc1f8895e935140b37f1e5190d1b0389616b5705744b430) |
| 33 | `withdraw(breach-1)` | provider | **ERROR** | `withdraw(breach-1)` by the provider: **UserError** `only the party the outcome names may withdraw` | [`0x67186846…b39a7b`](https://explorer-studio-dev.genlayer.com/tx/0x67186846579bcacfb7626f949724973d69a211d9de19fc5a45745acc11b39a7b) |
| 34 | `withdraw(breach-1)` | client | SUCCESS | FINALIZED. the client takes the 3 GEN bond | [`0x2c38ac54…377fe7`](https://explorer-studio-dev.genlayer.com/tx/0x2c38ac541134e320bc9215e024837c959fd883f05b412a4e187bf8bb38377fe7) |
| 35 | `score(dl-1)` | stranger | **ERROR** | `score(dl-1, 1)` after the final deadline: **UserError** `the final deadline has passed at 1793485159; only expire is accepted` | [`0xd274fb62…f6512b`](https://explorer-studio-dev.genlayer.com/tx/0xd274fb62df0f0dac22854452aba2f9b459d1edda7b78cd15c4cd1946a2f6512b) |
| 36 | `settle(dl-1)` | stranger | **ERROR** | `settle(dl-1)` after the final deadline: **UserError** `the final deadline has passed at 1793485159; only expire is accepted` | [`0x98b6e0a2…cf756f`](https://explorer-studio-dev.genlayer.com/tx/0x98b6e0a206a49901adcda60808a293123466d3f6fb66a38aa5209f29cfcf756f) |
| 37 | `expire(dl-1)` | stranger | SUCCESS | `expire(dl-1)` → VOID | [`0x12fab560…19a6a9`](https://explorer-studio-dev.genlayer.com/tx/0x12fab56098421a108faf469f227b49d159f432bf7f6fb8f7ec1a3bda5019a6a9) |
| 38 | `withdraw(dl-1)` | provider | SUCCESS | FINALIZED. the provider takes the unscored bond back (1 GEN) | [`0x5afdd2b1…3d5e14`](https://explorer-studio-dev.genlayer.com/tx/0x5afdd2b1f20e9634ea78932837e5bbcf22bbab5438c8280c3f5bc81c643d5e14) |
| 39 | `withdraw_credit()` | provider | SUCCESS | FINALIZED. credit from the two refused bonds: 1.5 GEN | [`0xf98034b5…504720`](https://explorer-studio-dev.genlayer.com/tx/0xf98034b58781c28e6dc9ed539bb47a25cde31dfaf710f9242e25c1f43a504720) |

### What the run shows

* **The sums are the contract's.** `met-1`: one reading, 95, bar 70 → MET. `breach-1`: delivery 1 read
  100, 100, 100; delivery 2 (the one-line guide, sha-256 `6d09f323c002…`) read 7, 8, 8; the medians 100 and 8
  total 108, below 70 × 2 = 140 → BREACHED and the client took the 3 GEN bond.
* **The median is computed in code.** The three readings of delivery 2 are in `get_delivery` and
  `get_round`; the final score is the middle one.
* **A round that validators could not agree on records nothing** (txs 13 and 21): the contract fails closed,
  the round is simply sent again (txs 27 and 31).
* **The final deadline splits time in two.** Txs 8 and 35–37 on `dl-1`: `expire` before the deadline and
  `score` / `settle` after it are each refused with their own message; `expire` then works.
* **Guards.** A stranger cannot deliver; an oversized page is refused; `settle` waits for every delivery to
  be scored; each party can collect only what the outcome names; a repeat round inside the interval is refused.
* **Money.** 6 GEN of bonds (2 + 3 + 1) and 1.5 GEN of refused value came in; the same 6 GEN of bonds and
  1.5 GEN of credit went out (2 to the provider, 3 to the client, 1 back to the provider, 1.5 credit); the contract holds 0 (`get_balance` → `{"balance":"0","credits":"0","held":"0"}`).

### What this run did not show

* The refusal messages of `dust-1` and `self-1` (txs 4–5) are returned in the call's result, which this
  script did not log; their credit (1.5 GEN, tx 39) is read from chain. The reasons are covered by
  `test_a_refused_bond_never_raises_and_credits_everything`.
* A page that validators judge **unscorable**, an out-of-range score and a forged consensus answer are
  covered by unit tests; a model cannot be made to fail on demand.
* The 260-bond registry and event paging are covered by unit tests, not by 260 transactions.
