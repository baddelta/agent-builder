# AuditAgents

Review existing subagent files and recommend model/effort changes that cut cost or fix weak results.

## Where to look

`~/.claude/agents/*.md` and `<project>/.claude/agents/*.md`, unless the user names specific files.

## What done looks like

- Every agent file is listed with its current `model` and `effort` (or "inherits" when unset).
- Each one is judged against `ModelSelection.md` (read it first) and gets one verdict: **keep**, **move down**, **move up**, or **set explicitly** (when `model` is missing).
- Each recommendation has a one-line reason tied to the agent's actual job (from its description and tools).
- Flag the common mismatches: a strong model doing cheap-to-check reading or search; a small model making code edits or judgment calls; no `model` set; effort above `high` where the next model up at `medium` would do.
- Agents that call external tools or other vendors' models (for example via a CLI inside the prompt) are noted as such. Their `model` field only controls the wrapper, so changing it matters less.
- No file is changed until the user approves. Then edit only the frontmatter lines and run `node <this skill's folder>/Tools/validate-agent.mjs` (or `bun`) on the changed files.
