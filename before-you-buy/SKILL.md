---
name: before-you-buy
description: >
  Before buying a pump.fun coin, read its history from pumpdata.fun: the
  deployer's record, the bundle at creation, the share of supply insiders
  hold, curve progress, how launches like it went over the next day, and what
  the first buyers' wallets have done since day one. Read-only HTTP calls,
  paid per call in USDC over x402 (no account); a full check costs about
  $0.02. Use with the swap skill, before building a buy.
metadata:
  author: pumpdatafun
  version: "1.0"
---

# Before you buy: a coin's history in four calls

[pumpdata.fun](https://pumpdata.fun) holds pump.fun's history, bonding curve and PumpSwap: "Every pump.fun trade, ever." This skill tells an agent which of its calls to make before buying a coin, what each costs, and how to read the answer. It is a separate service and is not run by pump.fun.

Every call here is a read. Nothing in this skill builds, signs or sends a trade; buys go through the [swap](../swap/) skill after the check.

## Before Starting Work

**Ask the user for these before spending anything:**

- [ ] The coin's mint address
- [ ] Spending approved: up to $0.02 in USDC per coin checked (more if the optional calls are wanted)
- [ ] How the agent pays x402: an x402 client or tool with its own USDC on Solana, or a free API key from https://pumpdata.fun/keys (5 calls an hour)
- [ ] The buyer addresses to check (optional): up to 50 wallets, such as the coin's first buyers from its trades

Do not pay for a call the user has not approved.

## The calls

Base URL: `https://pumpdata.fun`. Contract with each call's price in `x-payment-info`: https://pumpdata.fun/openapi.json. Plain-text guide: https://pumpdata.fun/llms.txt.

| Step | Call | Price | Gives |
| ---- | ---- | ----- | ----- |
| 1 (free) | `GET /stats.json` | free | yesterday on pump.fun (one UTC day): launches, graduations, volume, top coins, best deployers |
| 1 (free) | `GET /public/baserate.json` | free | yesterday's base rate for every market-cap band |
| 2 | `GET /launch/{mint}` | $0.005 | the deployer's record, the bundle at creation, insiders' share of supply, curve progress, how launches like it went over the next 24 h |
| 3 | `POST /wallets` | $0.01 | up to 50 wallets: each one's record on pump.fun |
| optional | `GET /deployer/{address}` | $0.005 | a deployer's full record with no coin needed |
| optional | `GET /similar/{mint}` | $0.005 | the launches most like this one, named by mint, and how each went |
| optional | `GET /baserate?band=...&from=...&to=...` | $0.005 | the base rate for a band and a window other than yesterday |

A pre-buy check (`/launch` + `/wallets` + `/baserate`, or the free `/public/baserate.json` in place of `/baserate`) costs $0.02 or less.

### 1. Free context: `GET /stats.json`

```bash
curl -s https://pumpdata.fun/stats.json
```

- `summary`: one paragraph about yesterday, ready to quote.
- `checks`: numbers that failed or warned a sanity check. Never quote a number listed there.
- Each coin and deployer in the file carries `check`: the paid call that goes deeper, with its price.
- A past day: `/stats/{YYYY-MM-DD}.json`.

`GET /public/baserate.json` gives, per band (`5k-10k`, `10k-15k`, `15k-28k`, ...), how many coins first traded inside that market-cap band yesterday (`crossed`), the share that then reached 2x, 5x, 10x and 20x within 3 h (`reached`), and `median_peak`. Use it to say how often coins at this market cap paid off anyway.

### 2. The launch: `GET /launch/{mint}` ($0.005)

```bash
curl -s https://pumpdata.fun/launch/<MINT>
```

Fields to read:

- `deployer`: `address`, `launches`, `graduations`, `best_peak`, `last_launch_gap_s` (seconds since its previous launch), `launches_last_day`.
- `bundle_at_creation`: `buyers_first_10s` (wallets that bought in the first 10 seconds) and `supply_share` (the share of supply they took).
- `insider_supply_share`: the share of supply insiders hold.
- `curve_progress`: the share of the bonding curve sold, 0 to 1; 1 once migrated. `migrated_at` is set after migration.
- `age_s`: the coin's age in seconds at the moment of the call.
- `matches`: launches that matched this one at the same age on the deployer's record, the bundle, the insider share and the curve progress. `n` is how many; `graduated_share` the share that reached the pool; `peak_day1` and `close_day1` are quantiles of the peak and of the market cap 24 h later, as multiples of the market cap at that age. Coins that died count.
- `summary`: one plain sentence built from the fields above.
- `compare_to`: yesterday's base rate for the band this coin sits in.
- `next_steps`: follow-up calls with their paths and prices filled in.
- `freshness.data_as_of`: when the data was built; `lag_s` how far it trails the chain.

A mint minutes old answers too. A mint the warehouse does not know yet answers `404` and nothing is charged; retry later.

### 3. The buyers: `POST /wallets` ($0.01 for up to 50)

```bash
curl -s -X POST https://pumpdata.fun/wallets \
  -H 'content-type: application/json' \
  -d '{"addresses": ["<WALLET_1>", "<WALLET_2>"], "mint": "<MINT>"}'
```

Pass the mint so `new` is judged against the coin's creation. The answer is one record per address:

- `class`: a label set by a fixed rule, one of `winner`, `bot`, `supply_seller`, `new`, `none`.
  - `bot`: trades a coin 20+ times a week, or 500+ coins.
  - `supply_seller`: took out 1.5x what it put in, 100 SOL or more.
  - `winner`: took out more than it put in over 20+ coin-weeks.
  - `new`: no record before the mint given.
  - `none`: a record that fits no rule (most wallets).
  - The first rule that fits, in the order `bot`, `supply_seller`, `winner`.
- `pnl_sol`: `took_out` minus `put_in`, in SOL, over every trade on pump.fun's bonding curve and PumpSwap pools.
- `put_in`, `took_out`: SOL. `coins`: how many coins it traded. `first_seen`: its first trade.
- `summary`: one plain sentence per wallet.

A wallet that buys here and sells on another DEX shows only its buy legs, so its `pnl_sol` here runs negative.

### Optional: `GET /deployer/{address}` and `GET /similar/{mint}` ($0.005 each)

- `/deployer/{address}`: `record` (launches, graduations, graduation rate, best peak, gap between launches, last launch), `last_90_days` (how many of its launches doubled, did 10x, held 2x a day later, or were dead the next day: `doubled`, `ten_x`, `held_2x`, `dead_next_day`, each with its share; the answer's `definitions` says how each is measured), `recent_launches`, and `next_launch`: how launches went for deployers with the same record.
- `/similar/{mint}` (`?limit=1..25`): `comparables`, the launches most like this one at 5 minutes old, the same deployer's earlier launches first. Each has its `mint`, its state at 5 minutes (`at_5m`), `next_24h` (`dead`, `peak_mult`, `close_mult`) and `similar_because`. Open any of them on pump.fun to check.

## Paying: x402

Every paid call works the same way:

1. Call it with no payment. It answers **HTTP 402** with the offer in the body (`accepts`: amount in USDC base units, asset, network `solana`, scheme `exact`, payee) and in the `PAYMENT-REQUIRED` header.
2. The agent's x402 client signs a USDC transfer for that amount and retries the same request with the `PAYMENT-SIGNATURE` header.
3. The answer comes back `200` with the receipt in `PAYMENT-RESPONSE`.

Most x402 clients do steps 2 and 3 for you. No account or plan is needed.

With a free API key, send `x-api-key: pdk_...` instead; each answer carries `X-RateLimit-Remaining`, and past 5 calls an hour the same call asks for x402 payment.

| Status | Meaning |
| ------ | ------- |
| `200` | The answer. Quote `X-Data-As-Of` with any number that matters. |
| `402` | The price, or a payment that was refused (read `reason`). Nothing settled. |
| `404` | Unknown mint, or a window before the data begins. Nothing charged. |
| `400` | Malformed request. Nothing charged. |
| `429` | Too many calls. Wait for `retry-after`. |
| `503` `payment_settle_uncertain` | The payment may or may not have settled. Do not pay again blindly. |

## Reporting the answer

Give the user the numbers and what they mean, and leave the decision to the user or to the agent's own rule.

- State facts with their source field (the shapes below are examples, not a real coin): "the deployer's 9th launch, 2 graduated", "4 wallets bought in the first 10 seconds and took 11% of the supply", "of 340 matching launches, 6% graduated and the median close a day later was 0.1x".
- Say a label as the rule and the SOL behind it: "3 wallets are class `bot` (they trade 500+ coins)", "2 are class `winner`, 41 and 17 SOL net". Do not turn a label into a verdict on the wallet or the coin.
- Coins that died count in every share. Never drop them.
- Say the as-of time (`X-Data-As-Of` or `freshness.data_as_of`); the data trails the chain.
- `matches`, `similar` and base rates describe what earlier launches did. They are not a forecast for this coin.

## Safety Rules

- **NEVER** spend beyond the amount the user approved.
- **NEVER** log, print, or return private keys or secret key material, including the key the x402 client signs with.
- **NEVER** build, sign or send a trade from this skill. Use the swap skill for that, after the check.
- **ALWAYS** confirm the mint address with the user before paying for a call on it.

## End-to-end flow

1. Confirm the mint, the spending cap and the payment method with the user.
2. Optional, free: `GET /stats.json` and `GET /public/baserate.json` for yesterday's context and the band's base rate.
3. `GET /launch/{mint}` ($0.005): the deployer, the bundle, insiders' share, curve progress and how matching launches went.
4. `POST /wallets` ($0.01) with up to 50 buyer addresses and the mint: each buyer's record.
5. Optional: `GET /deployer/{address}` or `GET /similar/{mint}` ($0.005 each) for more on the deployer or on comparable launches.
6. Report the numbers to the user as above. If the user decides to buy, hand off to the swap skill.
