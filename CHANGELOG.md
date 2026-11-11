# Changelog

All notable changes to this plugin. Versions follow [semver](https://semver.org/).

## 1.1.0 — 2026-11-11

Ideas from two more claude.dev articles: ["Lessons from Building Claude Code: How We Use Skills"](https://claude.dev/blog/lessons-from-building-claude-code-how-we-use-skills/) and ["Building Effective Agent Automations"](https://claude.dev/blog/building-effective-agent-automations/).

- Agent instructions are now written as goal, rules, known pitfalls and output, instead of numbered scripts.
- Every agent gets honest-reporting rules: a failed read is reported as a failure, never as "nothing found"; statuses are stated or dropped; links and IDs are copied from the source.
- New rules for unattended agents (scheduled, CI, headless): least access, a per-run spending cap, a run record, bookmarks instead of time windows, and confirmed actions only.
- New build log at `~/.claude/agent-builder/agents-log.md`. The audit reads your notes on how each agent did, and repeated lessons become new Gotchas.
- The audit also flags weak instructions (long numbered scripts, missing honest-reporting rules) and unattended agents with too much access.
- Example agent rewritten in the new style.

## 1.0.0 — 2026-11-11

First release.

- `agent-builder` skill: creates Claude Code subagents and picks model + effort for each, with a short reason per agent.
- Model guidance summarized from Addy Osmani's ["Which Claude model should you build with?"](https://claude.dev/blog/which-claude-model-should-you-build-with/) (snapshot 2026-11-11).
- Workflows for creating single agents, agent teams (lead + workers + checker), and auditing existing agents.
- Support for subscription plans (describe cost as plan-limit usage) and saved user preferences.
- `validate-agent.mjs`: dependency-free checker for agent files.
- Rules added after test runs: match the model to how its output gets checked; leads must run as the main session; Bash counts as a write tool; always write `effort` out; check for existing agents first.
