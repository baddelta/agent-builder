# CreateAgent

Produce one or more Claude Code subagent files, each with a model and effort chosen on purpose and a one-line reason for that choice.

## Step 0 — Sufficiency check

You need three things per agent: **what it does**, **what it may touch** (read-only or edits), and **where it should live** (all projects or one project). If one is missing but guessable, pick the sensible default, say so in one line (`⚠️ Picking X because R; tell me if wrong.`), and continue. Ask at most 3 questions, only if a wrong guess would produce the wrong agent.

Location: general-purpose agents go to the user's default (`~/.claude/agents/` unless `~/.claude/agent-builder/PREFERENCES.md` says otherwise). Agents tied to one codebase (they name its files, stack, or test commands) go to `<project>/.claude/agents/`, regardless of the default.

Before writing, check for an existing agent that already does the job (see Gotchas in SKILL.md).

## What done looks like

- Each agent is a file `<location>/<agent-name>.md` with lowercase-hyphenated `name` matching the filename.
- Frontmatter has `name`, `description`, `tools`, `model`, and `effort`. Always write `effort` out, even when it matches the default, so the user can see and change it in one place.
- `model` was chosen from `ModelSelection.md` (read it first). The cheapest model that can reliably do the job wins. Escalation order is respected.
- `tools` is the smallest set the job needs. Read-only agents get no Edit/Write.
- The body is a short system prompt: what to do, what to return, and what not to do.
- No existing agent file was overwritten without the user's OK. Check first.
- The user sees a short table: agent → model → effort → why.

## File template

```markdown
---
name: log-reader
description: Reads test output and logs, and reports each failing case. Use after a test run.
tools: Read, Grep, Glob
model: haiku
effort: medium
---

Read the logs you're given. For each failure, report the file, the test name and the first error line. Don't edit any files.
```

Valid `model` values: `haiku`, `sonnet`, `opus`, `fable`, `inherit`, or a full model ID. Valid `effort` values: `low`, `medium`, `high`, `xhigh`, `max`.

## Teams

When the user asks for several agents working together, decide first whether a team is worth it (see "Teams of agents" in `ModelSelection.md`). If yes:
- The lead gets the strong model and the `Agent` tool, and its prompt names each worker and when to call it.
- Workers get the cheapest model that fits their piece, using the "match the model to how the output gets checked" rule in SKILL.md.
- Include a checker (tests or a parity/verification agent) so worker mistakes get caught. That is what makes cheap workers safe.
- Tell the user how to run the lead as the main session (`claude --agent <lead-name>`), since subagents can't start subagents.
- Team-specific agents go in the project's `.claude/agents/`.

## After writing

Run `node <this skill's folder>/Tools/validate-agent.mjs <file>...` (or `bun` instead of `node`) on every file you wrote and fix anything it reports. Tell the user that new agents are picked up on the next session (or via `/agents`).
