---
name: tokenized-agents
description: Accept payments and verify invoices on-chain for Pump Tokenized Agents using @pump-fun/agent-payments-sdk. Use when handling payments, building accept-payment transactions, or verifying that a user has paid an invoice.
metadata:
  author: pump-fun
  version: "1.0"
---

# Pump Tokenized Agent Payments

Pump Tokenized Agents are AI agents whose revenue is linked to a token on pump.fun. The `@pump-fun/agent-payments-sdk` lets you build payment transactions and verify invoices on Solana.

## Safety Rules

- **NEVER** log, print, or return private keys or secret key material.
- **NEVER** sign transactions on behalf of a user — you build the instruction, the user signs.
- Always validate that `amount > 0` before creating an invoice.
- Always ensure `endTime > startTime` and both are valid Unix timestamps.
- Use the correct decimal precision for the currency (6 decimals for USDC, 9 for SOL).

## Supported Currencies

| Currency    | Decimals | Smallest unit example        |
|-------------|----------|------------------------------|
| USDC        | 6        | `1000000` = 1 USDC           |
| Wrapped SOL | 9        | `1000000000` = 1 SOL         |

## Setup

```bash
npm install @pump-fun/agent-payments-sdk
```

```typescript
import { PumpAgent } from "@pump-fun/agent-payments-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("<SOLANA_RPC_URL>");
const mint = new PublicKey("<AGENT_TOKEN_MINT_ADDRESS>");

const agent = new PumpAgent(mint, connection);
```

`mint` is the token mint address created when the tokenized agent coin was launched on pump.fun.

## Accept Payment (Build Transaction Instruction)

Use `acceptPaymentSimple` to build a `TransactionInstruction` that the user will sign and submit. This transfers funds from the user's token account to the agent's payment vault.

### Parameters

| Parameter          | Type                         | Description                                          |
|--------------------|------------------------------|------------------------------------------------------|
| `user`             | `PublicKey`                  | The payer's wallet address                           |
| `userTokenAccount` | `PublicKey`                  | The payer's token account for the currency           |
| `currencyMint`     | `PublicKey`                  | Mint address of the payment currency (USDC, wSOL)    |
| `amount`           | `bigint \| number \| string` | Price in the currency's smallest unit                |
| `memo`             | `bigint \| number \| string` | Unique invoice identifier (random u64 or counter)    |
| `startTime`        | `bigint \| number \| string` | Unix timestamp — when the invoice becomes valid      |
| `endTime`          | `bigint \| number \| string` | Unix timestamp — when the invoice expires            |
| `tokenProgram`     | `PublicKey` (optional)       | Token program for the currency (defaults to SPL Token) |

### Example

```typescript
const ix = await agent.acceptPaymentSimple({
  user: userPublicKey,
  userTokenAccount: userTokenAccountAddress,
  currencyMint: currencyMintPublicKey,
  amount: "1000000",       // 1 USDC
  memo: "123456789",       // unique invoice memo
  startTime: "1700000000", // valid from
  endTime: "1700086400",   // expires at
});
```

The returned `ix` is a `TransactionInstruction`. Include it in a Solana transaction for the user to sign and submit.

### Important

- The `amount`, `memo`, `startTime`, and `endTime` must exactly match the registered invoice.
- The user must have sufficient balance in their `userTokenAccount`.
- Each unique combination of `(mint, currencyMint, amount, memo, startTime, endTime)` can only be paid once — the on-chain Invoice ID PDA prevents duplicate payments.

## Verify Payment

Use `validateInvoicePayment` to confirm that a specific invoice was paid on-chain. It returns `true` if a matching `agentAcceptPaymentEvent` is found, `false` otherwise.

Under the hood it:
1. Derives the Invoice ID PDA from `(mint, currencyMint, amount, memo, startTime, endTime)`.
2. Fetches all transaction signatures for that PDA address.
3. Parses transaction logs looking for the `agentAcceptPaymentEvent` event.
4. Matches event fields (`user`, `tokenizedAgentMint`, `currencyMint`, `amount`, `memo`, `startTime`, `endTime`) against the expected values.

### Parameters

All numeric parameters must be `BN` (from `@coral-xyz/anchor`).

| Parameter      | Type        | Description                          |
|----------------|-------------|--------------------------------------|
| `user`         | `PublicKey`  | The wallet that paid                 |
| `currencyMint` | `PublicKey`  | Currency used for payment            |
| `amount`       | `BN`         | Amount paid (smallest unit)          |
| `memo`         | `BN`         | The invoice memo                     |
| `startTime`    | `BN`         | Invoice start time (Unix timestamp)  |
| `endTime`      | `BN`         | Invoice end time (Unix timestamp)    |

### Example

```typescript
import { BN } from "@coral-xyz/anchor";

const paid = await agent.validateInvoicePayment({
  user: userPublicKey,
  currencyMint: currencyMintPublicKey,
  amount: new BN("1000000"),
  memo: new BN("123456789"),
  startTime: new BN("1700000000"),
  endTime: new BN("1700086400"),
});

if (paid) {
  // Payment confirmed — deliver the good or service
} else {
  // Payment not found — ask user to retry or check details
}
```

### Tip: Converting from simple types

If you have `string` or `number` values, convert them to `BN` before calling `validateInvoicePayment`:

```typescript
import { BN } from "@coral-xyz/anchor";

const amount = new BN("1000000");
const memo = new BN("123456789");
const startTime = new BN("1700000000");
const endTime = new BN("1700086400");
```

## End-to-End Flow

```
Agent decides on price → generates unique memo → sets time window
    ↓
acceptPaymentSimple(...) → returns TransactionInstruction
    ↓
User signs and submits the transaction on Solana
    ↓
validateInvoicePayment(...) → returns true/false
    ↓
Agent delivers the good/service (or retries verification)
```

---

## Integrating Into an Agent Backend

To use this skill from an LLM-powered agent, you need three things:

1. **Load the skill text** into the system prompt so the LLM understands the payment protocol.
2. **Define tools** the LLM can call to build transactions and verify payments.
3. **Run an agent loop** that executes tool calls and feeds results back to the LLM.

### 1. Define Tools

Expose two tools to your LLM:

**`build_accept_payment`** — Builds the on-chain transaction for the user to sign.

```typescript
{
  name: "build_accept_payment",
  description: "Build the acceptPayment transaction instruction for the user to sign. Returns a serialized transaction.",
  parameters: {
    userWallet: "string — the user's Solana wallet public key (base58)",
    amount: "string — payment amount in smallest currency unit",
    memo: "string — unique invoice identifier",
    startTime: "string — Unix timestamp, invoice valid from",
    endTime: "string — Unix timestamp, invoice expires at",
  }
}
```

**`verify_payment`** — Checks on-chain whether an invoice has been paid.

```typescript
{
  name: "verify_payment",
  description: "Verify whether an invoice was paid on-chain. Returns { paid: true/false }.",
  parameters: {
    userWallet: "string — the wallet that should have paid",
    amount: "string — expected payment amount",
    memo: "string — the invoice memo",
    startTime: "string — invoice start time",
    endTime: "string — invoice end time",
  }
}
```

### 2. Implement Tool Handlers

Wire the tools to the SDK:

```typescript
import { PumpAgent } from "@pump-fun/agent-payments-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

const connection = new Connection("<SOLANA_RPC_URL>");
const mint = new PublicKey("<AGENT_TOKEN_MINT_ADDRESS>");
const currencyMint = new PublicKey("<CURRENCY_MINT_ADDRESS>");
const agent = new PumpAgent(mint, connection);

async function handleBuildAcceptPayment(input: {
  userWallet: string;
  amount: string;
  memo: string;
  startTime: string;
  endTime: string;
}) {
  const user = new PublicKey(input.userWallet);
  const userTokenAccount = getAssociatedTokenAddressSync(currencyMint, user);

  const ix = await agent.acceptPaymentSimple({
    user,
    userTokenAccount,
    currencyMint,
    amount: input.amount,
    memo: input.memo,
    startTime: input.startTime,
    endTime: input.endTime,
  });

  // Serialize the instruction into a transaction for the user to sign
  // (your framework determines how you return this to the frontend)
  return { instruction: ix };
}

async function handleVerifyPayment(input: {
  userWallet: string;
  amount: string;
  memo: string;
  startTime: string;
  endTime: string;
}) {
  const paid = await agent.validateInvoicePayment({
    user: new PublicKey(input.userWallet),
    currencyMint,
    amount: new BN(input.amount),
    memo: new BN(input.memo),
    startTime: new BN(input.startTime),
    endTime: new BN(input.endTime),
  });

  return { paid };
}
```

### 3. Wire Into the Agent Loop

Load the skill text and inject it alongside your agent's configuration into the system prompt. When the LLM returns a tool call, execute the matching handler and feed the result back.

```typescript
import fs from "fs";

const skillText = fs.readFileSync("path/to/tokenized-agents/SKILL.md", "utf-8");

const systemPrompt = `You are an AI agent that sells a service.
Before delivering, you must ensure the user has paid.

<payment_skill>
${skillText}
</payment_skill>

<agent_configuration>
Agent Token Mint: ${mint.toBase58()}
Currency Mint: ${currencyMint.toBase58()}
Price: 1000000 (1 USDC)
</agent_configuration>

## Your Workflow
1. When a user requests your service, generate a unique memo and time window.
2. Call build_accept_payment to create the transaction for the user.
3. After the user claims to have paid, call verify_payment.
4. If verified, deliver the service. If not, ask the user to retry.`;

// In your agent loop:
// 1. Send messages + systemPrompt + tools to the LLM
// 2. When the LLM returns tool_use, call handleBuildAcceptPayment or handleVerifyPayment
// 3. Feed the result back as a tool_result message
// 4. Repeat until the LLM returns a final text response
```

---

## Scenario Tests

### Scenario 1: Happy Path — Pay and Verify

1. Agent generates invoice: amount `1000000` (1 USDC), memo `42`, startTime `1700000000`, endTime `1700086400`.
2. Agent calls `acceptPaymentSimple` with the user's wallet and the invoice params.
3. User signs and submits the returned transaction on Solana.
4. Agent calls `validateInvoicePayment` with the same params.
5. `validateInvoicePayment` returns `true`.
6. Agent delivers the service.

**Expected:** Payment succeeds, verification returns `true`, service is delivered.

### Scenario 2: Verify Before Payment

1. Agent generates invoice: amount `500000`, memo `7777`, valid for 1 hour.
2. Agent immediately calls `validateInvoicePayment` (user hasn't paid yet).
3. `validateInvoicePayment` returns `false`.
4. Agent tells the user payment is not confirmed and to try again after paying.

**Expected:** Verification returns `false`. Agent does **not** deliver the service.

### Scenario 3: Duplicate Payment Rejection

1. Agent generates invoice with memo `99`.
2. User pays successfully. `validateInvoicePayment` returns `true`.
3. A second user (or same user) tries to submit the same `acceptPayment` transaction again.
4. The on-chain program rejects it because the Invoice ID PDA is already initialized.

**Expected:** Second payment fails on-chain. The agent should inform the user the invoice is already paid and generate a new one if needed.

### Scenario 4: Mismatched Parameters

1. Agent generates invoice: amount `1000000`, memo `555`.
2. User pays with a different amount (`2000000`) but same memo.
3. Agent calls `validateInvoicePayment` with the original params (amount `1000000`, memo `555`).
4. Returns `false` — the on-chain event has a different amount.

**Expected:** Verification fails because `amount` doesn't match. Agent should not deliver.

### Scenario 5: Expired Invoice

1. Agent generates invoice with `endTime` in the past.
2. User tries to submit the `acceptPayment` transaction.
3. The on-chain program rejects it (timestamp outside validity window).
4. `validateInvoicePayment` returns `false`.

**Expected:** Payment rejected on-chain. Agent should generate a new invoice with a valid time window.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `validateInvoicePayment` returns `false` but user claims they paid | Transaction may still be confirming, or params don't match | Wait a few seconds and retry. Double-check that `amount`, `memo`, `startTime`, `endTime`, and `user` all match exactly. |
| Invoice already paid | The Invoice ID PDA is already initialized | This invoice was already paid. Generate a new one with a different `memo`. |
| Insufficient balance | User's token account doesn't have enough tokens | Tell the user to fund their wallet before paying. |
| Currency not supported | The `currencyMint` is not in the protocol's `GlobalConfig` | Use a supported currency (USDC, wSOL). |

---

## Further Reference

See [skills.md](skills.md) for the full SDK reference including vault balances, fund withdrawal, payment distribution, vault architecture, and troubleshooting.
