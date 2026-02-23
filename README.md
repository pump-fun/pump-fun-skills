# pump-fun-skills

A collection of skill definitions that teach AI agents how to interact with the [pump.fun](https://pump.fun) platform. Each skill is a structured document that an AI agent can read and follow to perform specific tasks — such as accepting payments, managing invoices, and withdrawing funds — using pump.fun's on-chain programs and SDKs.

## What Are Skills?

Skills are detailed, self-contained instruction sets designed for AI agents. They describe **when** to use a capability, **what inputs** are needed, **how** to execute it step-by-step, and **what output** to return. By loading a skill file, an AI agent gains the knowledge required to carry out a specific workflow without additional human guidance.

## Available Skills

| Skill | Path | Description |
|---|---|---|
| Tokenized Agent Payments | [`tokenized-agents/skills.md`](tokenized-agents/skills.md) | Accept payments, create and verify invoices, check vault balances, and withdraw funds for Pump Tokenized Agents using the `@pump-fun/agent-payments-sdk`. |

## Repo Structure

```
pump-fun-skills/
├── README.md
└── tokenized-agents/
    └── skills.md          # Payment skills for tokenized agents
```

## Getting Started

1. **Point your AI agent at a skill file.** Load the contents of a skill document (e.g. `tokenized-agents/skills.md`) into your agent's context so it can follow the instructions.

2. **Install the required SDK.** Skills reference specific packages — for tokenized agent payments, install:

   ```bash
   npm install @pump-fun/agent-payments-sdk
   ```

3. **Configure your agent.** Provide the agent with the required parameters described in the skill (RPC URL, token mint address, API endpoints, etc.).

4. **Invoke the skill.** Ask your agent to perform one of the documented tasks (e.g. "Create an invoice for 5 USDC") and it will follow the skill's step-by-step instructions.

## Tokenized Agent Payments — Overview

The tokenized agent payments skill covers the full payment lifecycle for Pump Tokenized Agents — AI agents whose revenue is linked to a token on pump.fun via automatic buybacks.

**Core capabilities:**

- **Create Invoice** — Define a price, memo, and validity window; register the invoice off-chain.
- **Accept Payment** — Build a Solana transaction instruction for the user to sign and submit.
- **Verify Payment** — Confirm payment status via the DB API or on-chain event lookup.
- **Check Balances** — Inspect payment, buyback, and withdraw vault balances.
- **Withdraw Funds** — Transfer earned funds from the withdraw vault to a destination wallet (requires agent authority keypair).

See [`tokenized-agents/skills.md`](tokenized-agents/skills.md) for the full reference including input schemas, code examples, safety rules, and troubleshooting.

## Contributing

To add a new skill:

1. Create a directory for the skill domain (e.g. `token-trading/`).
2. Add a `skills.md` file following the existing format — include an overview, safety rules, permissions model, step-by-step instructions for each capability, and troubleshooting guidance.
3. Update this README to list the new skill in the table above.

## License

See the repository's license file for details.
