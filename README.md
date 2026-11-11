# agent-builder

A [Claude Code](https://claude.com/claude-code) plugin that creates subagents and picks the right Claude model and effort level for each one.

Ask Claude for an agent ("make me an agent that reads my test logs") and it writes the agent file, chooses Haiku, Sonnet, Opus or Fable based on what the agent actually does, and explains why. It can also build a team of agents with a lead and cheaper workers, or review the agents you already have and flag ones running on a more expensive model than they need.

## Why

Agents that don't name a model inherit your session's model, which is usually the most expensive one. A log reader running on a top model burns your budget or plan limits for no gain, and a code-editing agent on a small model makes quiet mistakes. This plugin applies one consistent set of rules so each agent gets the cheapest model that can reliably do its job.

## Credit

The model-selection guidance is based on **["Which Claude model should you build with?"](https://claude.dev/blog/which-claude-model-should-you-build-with/)** by Addy Osmani on the claude.dev blog (Anthropic). [`ModelSelection.md`](skills/agent-builder/ModelSelection.md) summarizes it in our own words, with a snapshot date. Go read the original. It has the benchmarks and reasoning behind every recommendation here.

Two more claude.dev articles shaped how the agents themselves are written:

- **["Lessons from Building Claude Code: How We Use Skills"](https://claude.dev/blog/lessons-from-building-claude-code-how-we-use-skills/)** by Thariq Shihipar. This is where we got: give agents a goal and rules rather than numbered scripts, include a known-pitfalls section, and keep a log so the skill learns over time.
- **["Building Effective Agent Automations"](https://claude.dev/blog/building-effective-agent-automations/)** by Lance Martin and CJ Avilla. This is where we got: the honest-reporting rules (a failed read is never "nothing found", state a status or drop it, copy links from the source) and the rules for unattended agents (least access, a spending cap, a sign it ran, bookmarks instead of time windows).

Where this plugin goes beyond these articles (for example the "match the model to how the output gets checked" rule, and the notes on subscription plans), that's our own interpretation, learned from testing. It isn't Anthropic's advice.

## Requirements

| Need | Why | Check |
|------|-----|-------|
| Claude Code with plugin support | Installs and runs the plugin | `claude --version` |
| Node.js 18+ **or** Bun | Runs the optional agent checker (`validate-agent.mjs`). The skill still works without it, you just lose the automatic check. | `node --version` |
| Access to the models you want to use | Agents can only run on models your plan offers | Type `/model` in Claude Code |

Works on API billing (pay per token) and on Claude subscriptions (Pro, Max, Team, Enterprise). The first time you use it, Claude asks which one you're on and which models you have, and can save your answers to `~/.claude/agent-builder/PREFERENCES.md`.

## Install

In Claude Code:

```
/plugin marketplace add baddelta/agent-builder
/plugin install agent-builder@agent-builder
```

Restart Claude Code (or start a new session) so the skill loads.

**Update to the latest version:**

```
/plugin marketplace update agent-builder
```

**Without the plugin system:** copy `skills/agent-builder/` into `~/.claude/skills/`.

## Use

Just ask in plain words. For example:

- "Make me an agent that reads test logs and tells me which tests failed."
- "Create an agent that reviews my PRs for bugs before I merge."
- "Build a team of agents to migrate this API from REST to GraphQL."
- "Are my agents on the right models?"

- "Make an agent that checks my open PRs every morning." (an unattended agent, so it gets extra safety rules)
- "The log reader missed failures in long logs." (recorded in the build log for the next audit)

Each run ends with a table showing every agent, its model, its effort level, and why it was chosen. New agents are picked up in your next session, or right away via `/agents`.

**Your files** (created on first use, never shipped with the plugin):

| File | What it holds | Who writes it |
|------|---------------|---------------|
| `~/.claude/agent-builder/PREFERENCES.md` | Your plan, available models, default save location | You (Claude asks before changing it) |
| `~/.claude/agent-builder/agents-log.md` | Every agent built, its model and why, plus your notes on how it did | Claude appends; you add notes |

To check an agent file yourself:

```bash
node skills/agent-builder/Tools/validate-agent.mjs ~/.claude/agents/*.md
```

## How it picks a model

| Agent's job | Model | Effort |
|-------------|-------|--------|
| Classify, route, tag, extract | Haiku | medium |
| Read-only side tasks: search, logs, summaries | Haiku (Sonnet for very long inputs) | medium |
| Scoped edits or reviews with a test or checker behind them | Sonnet | medium → high |
| Judgment with no safety net, everyday engineering | Opus | medium → high |
| Migrations, architecture, leading other agents, deep research | Fable | medium → high |
| Not sure | Opus | medium |

When an agent falls short, the skill escalates in this order:
1. Give the agent a way to check its own work.
2. Raise effort one level.
3. Move up one model, at a lower effort.

## What's inside

```
.claude-plugin/
  plugin.json           Plugin manifest
  marketplace.json      Lets this repo act as its own install source
skills/agent-builder/
  SKILL.md              Instructions Claude loads when the skill triggers
  ModelSelection.md     Model-selection reference (summary of the article above)
  PreferencesTemplate.md  Template for your saved plan/model preferences
  Workflows/
    CreateAgent.md      Creating one agent or a team
    AuditAgents.md      Reviewing existing agents
  Tools/
    validate-agent.mjs  Agent file checker (no dependencies)
examples/
  test-log-reader.md    A finished agent made with this skill
```

## Known limits

- **Prices and model names change.** `ModelSelection.md` is dated. If it's older than a few months, check the source article and Anthropic's pricing page.
- **Subagents can't start other subagents.** For agent teams, the lead has to run as your main session (`claude --agent <lead-name>`). The skill tells you this when it builds a team.
- **The checker doesn't catch everything.** It doesn't verify tool-name spelling or that an agent's instructions match its tools.

## Contributing

Found a case where it picked the wrong model? Open an issue with the request you gave it, the agent it produced, and what you expected. Lessons go into the Gotchas section of `SKILL.md`, and model-guidance updates go into `ModelSelection.md` with a new snapshot date. See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
