# AuditAgents

Review existing subagent files and recommend model/effort changes that cut cost or fix weak results. Also record how agents performed, so the skill's rules improve over time.

## Where to look

`~/.claude/agents/*.md` and `<project>/.claude/agents/*.md`, unless the user names specific files. Also read `~/.claude/agent-builder/agents-log.md` if it exists: its `notes` column holds the user's reports on how each agent actually did.

## What done looks like

- Every agent file is listed with its current `model` and `effort` (or "inherits" when unset).
- Each one is judged against `ModelSelection.md` (read it first) and the log notes, and gets one verdict: **keep**, **move down**, **move up**, or **set explicitly** (when `model` is missing).
- Each recommendation has a one-line reason tied to the agent's actual job (from its description and tools) or to a reported result from the log.
- Flag the common mismatches: a strong model doing cheap-to-check reading or search; a small model making unchecked edits or judgment calls; no `model` set; effort above `high` where the next model up at `medium` would do; an unattended agent with write access it doesn't need; one agent that both reads untrusted content (web, public issues, inbound email) and can edit, run commands or post, which should be split into a reader and an actor (see "Quarantine" in `CreateAgent.md`); a set of agents that exists only for one past job, which a workflow would have handled.
- Flag instruction problems too: bodies that are long numbered scripts, or that lack the honest-reporting rules from `CreateAgent.md`; agents that edit code but may change their own tests or skip flaky ones (the "Checks stay fixed" rule); a `Done` that is only unit tests for an agent whose changes users see; and two or more reviewers stacked on the same work where one tuned reviewer would do.
- Agents that call external tools or other vendors' models (for example via a CLI inside the prompt) are noted as such. Their `model` field only controls the wrapper, so changing it matters less.
- No file is changed until the user approves. Then edit only what was approved and run `node <this skill's folder>/Tools/validate-agent.mjs` (or `bun`) on the changed files.

## Recording results

When the user reports how an agent did ("the log reader missed failures in long logs"), add it to that agent's `notes` in the log with the date. If the same lesson shows up for two or more agents, suggest adding it to the Gotchas in SKILL.md. That is how the skill learns.

**Misses become rules, carefully.** When a reviewer agent let a bug through, suggest a line for the project's `REVIEW.md` only if the bug could have been spotted from the diff and the same kind of miss has happened at least twice. Write it as "when the diff touches X, check Y", and name the PR or incident it came from.

**Testing a reviewer** (when the user wants proof it catches what matters): collect past changes that were later reverted or rejected, each with a one-sentence description of the real bug, plus about the same number of merged changes that stayed clean. Run the reviewer on each at the commit it was reviewed. Count a catch only when a finding describes the real bug, and count every `Important` finding on a clean change as a false alarm. Keep some examples aside for a final check, so the reviewer isn't tuned to the exact cases it's scored on. Stop tuning when the next gain would only come from fitting those examples.

**Prune.** Rules, gotchas and `REVIEW.md` items only grow if nobody trims them. During an audit, point out ones that no longer match anything the agents do, or that haven't caught anything in a long time, and suggest removing them.
