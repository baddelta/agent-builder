---
name: agent-builder
description: "Creates Claude Code subagents (.claude/agents/*.md) and picks the best Claude model and effort level for each one (Haiku, Sonnet, Opus, or Fable) using cost, latency, and capability trade-offs. Also audits existing agents for over- or under-powered model choices and designs lead/worker agent teams. Use when the user wants to create an agent, make a subagent, build an agent team, asks which model an agent should use, wants cheaper or stronger agents, wants their agents audited, or compares haiku vs sonnet vs opus vs fable or effort levels for agents. Not for creating skills or for Claude API model questions unrelated to agents."
---

# Agent Builder

Builds subagent definition files and chooses a model + effort for each, so every agent runs on the cheapest model that can reliably do its job. The selection rules come from Anthropic's guide ["Which Claude model should you build with?"](https://claude.dev/blog/which-claude-model-should-you-build-with/) and are summarized in `ModelSelection.md` (in this skill's folder). Read that file before choosing any model.

## User preferences

Read `~/.claude/agent-builder/PREFERENCES.md` if it exists. It records the user's plan (API or a subscription seat), which models they have, and where they like agents saved.

If it doesn't exist, ask once, before choosing models: are they paying per token through the API, or on a Claude subscription (Pro, Max, Team, Enterprise)? Which models appear in their `/model` menu? Offer to save the answers to that file (template: `PreferencesTemplate.md` in this skill's folder) so you don't ask again.

The skill also keeps a build log at `~/.claude/agent-builder/agents-log.md`: one line per agent it creates, plus the user's notes on how each one performed. The preferences file belongs to the user (read it fresh each time, don't rewrite it without asking); the log is yours to append to.

## Workflows

| Request | File |
|---------|------|
| Create one agent, a team, or an unattended/scheduled agent | `Workflows/CreateAgent.md` |
| Review existing agents' model, effort and instructions | `Workflows/AuditAgents.md` |
| "That agent was too weak / worked great", feedback on an agent | `Workflows/AuditAgents.md` (Recording results) |

## Quick reference

| Agent's job | Model | Effort |
|-------------|-------|--------|
| Classify, route, tag, extract, high volume | `haiku` | `medium` |
| Same task over thousands of items, nobody waiting | no agent: a Batch API script on `haiku`, tested on ~50 items first | `medium` |
| Reviewer of another agent's work | a different model from the one it reviews (often `opus` reviewing `sonnet`) | `medium` |
| Side tasks: find files, read logs, summarize | `haiku` or `sonnet` | `medium` |
| Repeated investigation, review, drafting | `sonnet` | `medium` |
| Well-scoped coding (bug fix, spec-driven feature) | `sonnet` | `medium` → `high` |
| Everyday engineering, debugging, judgment calls | `opus` | `medium` → `high` |
| Computer use, vision-heavy loops | `opus` | `medium` |
| Big refactors, migrations, architecture, leading other agents, deep research | `fable` | `medium` → `high` |
| Not sure | `opus` | `medium` |

Escalate in this order when an agent falls short: (1) give it a way to check its own work, (2) raise effort one level, (3) move up one model at a *lower* effort.

## Examples

**One agent:** "Make me an agent that reads test logs and lists the failures" → read-only side task with easy-to-check output → `model: haiku`, `tools: Read, Grep, Glob` → writes `~/.claude/agents/test-log-reader.md` and explains the choice. A finished example ships in this plugin's `examples/` folder.

**A team:** "I want agents to migrate our API from REST to GraphQL" → 3–5 members: lead on `fable` (migrations are hard) written from `TeamLeadTemplate.md`, `sonnet` builders that each own their own files and must pass tests, a read-only reviewer on `opus` → writes the files into the project's `.claude/agents/` and explains how to run the lead.

**Bulk job:** "Make an agent to classify our 40,000 support tickets" → suggests a Batch API script on `haiku` instead of an agent, with a 50-ticket test run first.

**Audit:** "Are my agents on the right models?" → reads each agent's frontmatter, flags strong models doing log-reading or small models making unchecked edits, proposes changes and waits for approval.

## Gotchas

- **Subscription seats (Pro, Max, Team, Enterprise) don't pay per token.** On a seat, a bigger model or higher effort uses up the plan's usage limits faster instead of costing dollars. The ranking still holds, so pick models the same way, but describe cost as "uses your limit faster." Which models a seat can use depends on the plan and admin settings. If unsure whether `fable` is available, have the user check `/model` before you assign it, and fall back to `opus` at `high`. Fast mode bills as extra usage on most plans, so never turn it on for an agent without asking.
- **Prices and model names change.** `ModelSelection.md` is a dated snapshot. When the user asks about exact costs, say the date and suggest checking current pricing.
- **Match the model to how the output gets checked.** A small model's mistakes are quiet: a haiku agent that picks the wrong file sends the main model down the wrong path. Use this rule when the tables seem to disagree:
  - `haiku`: read-only work whose output is easy to check (search, logs, test results, extraction). Step up to `sonnet` when inputs are routinely very long or need real interpretation.
  - `sonnet`: scoped edits or reviews where something else catches mistakes, such as a test the agent must pass, a checker agent, or a person who reads every result.
  - `opus` (or `fable`): judgment with no safety net. Examples are design decisions, a review that is the last gate before merge or touches security, and edits with no test.
- **Subagents can't start other subagents.** A "lead" that dispatches workers has to run as the main session, either by launching it with `claude --agent <lead-name>` or by having the main session play the lead. Say this to the user whenever you build a team, and give the lead the `Agent` tool.
- **The cascade pattern (cheap first, strong on failure) lives in the lead, not the agent file.** An agent file's `model` is only its default. A lead can override it when dispatching (the Agent tool's `model` setting), so tell the lead when to re-dispatch on a stronger model, for example "after two failures, rerun on `opus`." Make a separate `x-strong` agent only when whatever dispatches it can't override the model.
- **Bash is a write tool too.** "Read-only" agents that need Bash (to run tests, `git diff`, `gh`) should list the commands they may run in their prompt. Leave Bash out when Read/Grep/Glob are enough.
- **Check what already exists first.** Look in `~/.claude/agents/`, `<project>/.claude/agents/`, and the agents the session already lists (plugins often ship reviewers and explorers). If one covers the job, suggest changing its `model:` line rather than building a duplicate.
- **More effort can cost as much as a bigger model.** Past `high`, compare against the next model up at `medium` before raising effort further.
- **Don't build a team for small work.** If the job is one chain of dependent steps, or fits in one context window, a lead + workers costs more than it saves.
- **Leaving `model` out means the agent inherits the session's model** (or `CLAUDE_CODE_SUBAGENT_MODEL` if set). That's usually the most expensive choice, so always set `model:` on purpose.
- **Use the aliases** (`haiku`, `sonnet`, `opus`, `fable`, `inherit`) rather than full model IDs, so agents keep working when new versions come out. Pin a full ID only when the user asks for it.
- **The `description` field decides when the agent gets used.** Write what it does and when to call it ("Use after a test run").
