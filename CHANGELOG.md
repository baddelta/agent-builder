# Changelog

All notable changes to this plugin. Versions follow [semver](https://semver.org/).

## 1.0.0 — 2026-11-11

First release.

- `agent-builder` skill: creates Claude Code subagents and picks model + effort for each, with a short reason per agent.
- Model guidance summarized from Addy Osmani's ["Which Claude model should you build with?"](https://claude.dev/blog/which-claude-model-should-you-build-with/) (snapshot 2026-11-11).
- Workflows for creating single agents, agent teams (lead + workers + checker), and auditing existing agents.
- Support for subscription plans (describe cost as plan-limit usage) and saved user preferences.
- `validate-agent.mjs`: dependency-free checker for agent files.
- Rules added after test runs: match the model to how its output gets checked; leads must run as the main session; Bash counts as a write tool; always write `effort` out; check for existing agents first.
