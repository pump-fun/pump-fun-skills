# pump-fun-skills

A collection of [Agent Skills](https://agentskills.io) that teach AI agents how to interact with the [pump.fun](https://pump.fun) platform. Each skill follows the Agent Skills format and can be loaded by any compatible AI agent to perform specific tasks using pump.fun's on-chain programs and SDKs.

## Available Skills

| Skill | Path | Description |
|---|---|---|
| Tokenized Agent Payments | [`tokenized-agents/SKILL.md`](tokenized-agents/SKILL.md) | Accept payments and verify invoices on-chain for Pump Tokenized Agents using `@pump-fun/agent-payments-sdk`. |

## Repo Structure

```
pump-fun-skills/
├── README.md
└── tokenized-agents/
    ├── SKILL.md          # Agent Skill (accept payment + verify payment)
    └── skills.md         # Full SDK reference
```

## Getting Started

1. **Point your AI agent at a skill.** Load `tokenized-agents/SKILL.md` into your agent's context.

2. **Install the required SDK.**

   ```bash
   npm install @pump-fun/agent-payments-sdk
   ```

3. **Configure your agent.** Provide the required parameters (Solana RPC URL, token mint address).

4. **Invoke the skill.** Ask your agent to accept a payment or verify an invoice and it will follow the instructions in the skill.

## Contributing

To add a new skill:

1. Create a directory for the skill domain (e.g. `token-trading/`).
2. Add a `SKILL.md` file with YAML frontmatter (`name`, `description`) followed by Markdown instructions.
3. Update this README to list the new skill in the table above.

## License

See the repository's license file for details.
