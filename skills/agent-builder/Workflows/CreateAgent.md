# CreateAgent

Produce one or more Claude Code subagent files, each with a model and effort chosen on purpose and a one-line reason for that choice.

## Step 0 — Sufficiency check

You need four things per agent: **what it does**, **what it may touch** (read-only or edits), **where it should live** (all projects or one project), and **whether it runs with someone watching** or unattended (on a schedule, in CI, headless). If one is missing but guessable, pick the sensible default, say so in one line (`⚠️ Picking X because R; tell me if wrong.`), and continue. Ask at most 3 questions, only if a wrong guess would produce the wrong agent.

Location: general-purpose agents go to the user's default (`~/.claude/agents/` unless `~/.claude/agent-builder/PREFERENCES.md` says otherwise). Agents tied to one codebase (they name its files, stack, or test commands) go to `<project>/.claude/agents/`, regardless of the default.

Agents tied to a codebase need facts from it (test command, folder layout). Read them from the repo when you can. When you can't, write a clearly marked placeholder, list every placeholder in your summary for the user to confirm, and don't present the agents as ready until they're filled in.

Before writing, check for an existing agent that already does the job (see Gotchas in SKILL.md), and skim `~/.claude/agent-builder/agents-log.md` if it exists for notes on similar agents built before.

## What done looks like

- Each agent is a file `<location>/<agent-name>.md` with lowercase-hyphenated `name` matching the filename.
- Frontmatter has `name`, `description`, `tools`, `model`, and `effort`. Always write `effort` out, even when it matches the default, so the user can see and change it in one place.
- `model` was chosen from `ModelSelection.md` (read it first). The cheapest model that can reliably do the job wins. Escalation order is respected.
- `tools` is the smallest set the job needs. Read-only agents get no Edit/Write.
- The body follows "Writing the agent's instructions" below.
- No existing agent file was overwritten without the user's OK. Check first.
- Each new agent has a line in the build log (see below).
- The user sees a short table: agent → model → effort → why.

## Writing the agent's instructions

Write the body as labeled parts, not a numbered script. The agent is a capable model: tell it what done looks like and what to avoid, and let it work out the steps. Use numbered steps only where order really matters (for example "run the tests before reporting").

A good body has:
- **Goal:** what the agent is for, and why it matters to the bigger job.
- **Owns:** the exact files and folders it may change, or "nothing (read-only)". This is what keeps parallel agents out of each other's way.
- **Rules:** what it must and must not do, including commands it may run.
- **Known pitfalls:** anything about this job that a smart newcomer would get wrong. Leave out generic advice the model already follows ("be thorough", "write clean code").
- **Done:** the concrete check that proves the work is finished: a test command that passes, a build that succeeds, every claim with a source, a sample checked by hand. "Looks right" is not a check.
- **Reports:** exactly what to return, and to whom (the caller, the lead, or another named agent).
- **Honest reporting** (include in every agent, adapted to its job):
  - If it can't read a source, a file is missing, or a command fails, it says so plainly. A failed read is never reported as "nothing found."
  - It states each status as fact or leaves it out. No "possibly still open."
  - It copies links, IDs and paths from the source and never builds them by hand.
  - For agents that act on what they read, it re-checks anything that may have changed right before acting.

## File template

```markdown
---
name: test-log-reader
description: Reads test output and logs, and reports each failing case. Use right after a test run, or when asked which tests failed.
tools: Read, Grep, Glob
model: haiku
effort: medium
---

Goal: report which tests failed in the logs or output you're given, so the caller can go fix them.

Owns: nothing. Read only. Never edit files or re-run tests.

Rules:
- If no log was named, use the newest test output you can find and say which file you used.

Known pitfalls:
- A run that crashed before any test ran (build or import error) has no per-test failures. Report the crash instead of "0 failures."

Done: every failure in the log is listed, and your count matches the totals the log reports. If the counts differ, say so.

Reports: for each failure, the test file, the test name, and the first error line copied exactly. Then the totals the log reports (passed / failed / skipped).

Honest reporting: if you can't find or read a log, say so. Never report "no failures" for a log you couldn't read. Copy paths and names exactly from the log.
```

Valid `model` values: `haiku`, `sonnet`, `opus`, `fable`, `inherit`, or a full model ID. Valid `effort` values: `low`, `medium`, `high`, `xhigh`, `max`.

## Teams

When the user asks for several agents working together, decide first whether a team is worth it (see "Teams of agents" in `ModelSelection.md`). If yes, the team looks like this:

- **Size:** 3–5 members. Add one only when its work can truly run in parallel with the others. Typical roles: an architect or planner, one builder per area (backend, frontend), a test engineer, and a reviewer.
- **Lead:** strong model (`fable` for migrations, architecture and big features; `opus` otherwise) and the `Agent` tool. It plans, splits the work into self-contained tasks with dependencies marked, hands them out, and steps in when a member drifts. It coordinates and does not write the code itself. Write its prompt from `TeamLeadTemplate.md` (in this skill's folder), filling in the bracketed fields.
- **Architect** (when the team has one): designs the shared contract (schema, interfaces) every builder works against. `opus` at `high` by default, since it's judgment with no test behind it; `fable` when the design is very large or ambiguous.
- **File ownership:** no two members edit the same file. Shared files (schemas, config, interfaces) belong to the lead or the architect, and builders ask instead of editing them. When one builder agent file is run many times in parallel (one run per area or batch), its `Owns` says "only the files named in your task", and the lead names the exact files in each task it hands out. Give parallel builders their own git worktrees so they can't collide.
- **Integration:** someone must merge the worktrees back. By default the lead asks the user before merging each branch that has passed review, then runs the tests on the merged result. Say this in the lead's prompt.
- **Builders:** the cheapest model that fits their piece, using the "match the model to how the output gets checked" rule in SKILL.md. `sonnet` is fine even for migration work **when** each task has a test it must pass and a reviewer on a stronger model; without both, use `opus`. Each builder's `Done` is a test command it must pass. For a task that fails twice, the lead re-dispatches it on a stronger model (see the cascade gotcha in SKILL.md).
- **Test engineer:** owns the test files. Its tests must fail before the code they test exists, which proves they can catch a missing or wrong implementation.
- **Talking to each other:** plain subagents can't message each other, so the lead relays questions between members (for example interface questions between the test engineer and a builder). Say so in the lead's and members' prompts. Only with agent teams (below) can members talk directly.
- **Reviewer:** read-only, outside the build, with fresh context, and on a **different model than the builders** (for example `opus` reviewing `sonnet` work) so it doesn't share their blind spots. It checks every finished task against the spec and the diff.
- **Done for the team:** a task counts as complete only when its test passes and the reviewer has checked it. The lead checks every progress claim against real tool output before reporting it.
- **Running it:** subagents can't start subagents, so the lead must run as the main session (`claude --agent <lead-name>`). Plain subagents finish when they return their report, so there is nothing to shut down. If the user's Claude Code supports agent teams (members that run alongside and message each other directly), mention that the lead can use them instead, in which case members can settle interfaces directly and the lead shuts them down at the end. Tell the user which applies.
- **Location:** team-specific agents go in the project's `.claude/agents/`. Reuse role agents that already exist there instead of writing duplicates.

## Unattended agents

When nobody will be watching the agent run (scheduled, `/loop`, CI, headless `claude -p`, or a cloud automation), add these on top of everything above:
- **Least access.** Read-only tools and read-only tokens wherever the agent only reads. Treat anything it reads (issues, messages, web pages) as possibly containing planted instructions, so it should have no power it doesn't need.
- **A spending limit.** Cap each run at roughly 3–5× what a normal run costs, measured from a few real runs, then tighten it. For headless Claude Code use `--max-turns`; for Claude Managed Agents use the deployment's `budget`. Tell the user a run that hits the cap can look like a quiet run.
- **A sign it ran.** Have it write a short run record (date, what it read, what it did, anything it couldn't read) so silence gets noticed.
- **Bookmarks, not time windows.** If it processes "new" items, it stores the last item or timestamp it handled and starts from there next run, instead of "the last 24 hours."
- **Confirmed actions only.** It counts a post, comment or change as done only after the tool confirms success, and records anything uncertain as "maybe done" instead of retrying blindly.
- **Model choice:** unattended agents have no person catching mistakes, so apply the "no safety net" rule in SKILL.md unless a test or checker verifies the output.

## Build log

After writing, append one line per agent to `~/.claude/agent-builder/agents-log.md` (create it with a header if missing):

```
| date | agent | location | model | effort | why | notes |
| 2026-11-11 | test-log-reader | ~/.claude/agents | haiku | medium | read-only, output easy to check | |
```

Leave `notes` empty. The user fills it in later ("too weak on long logs", "worked well"), or you add a note when they report how the agent did. The audit workflow reads this log.

## After writing

1. **Run the checker:** `node <this skill's folder>/Tools/validate-agent.mjs <file>...` (or `bun` instead of `node`) on every file you wrote. Fix every `error`. Treat each `warning` and `check:` line as a question: fix it, or tell the user in one line why it's intended (for example, a team lead always has the `Agent` tool).
2. **Read each agent back against its tools.** The checker's keyword hints miss things, so reread the body and confirm: every action it's told to take has a tool to do it; every tool it has is needed by something in the body (drop the rest); anything it's told never to do isn't something its tools invite. Fix mismatches before showing the user. Tell the user that new agents are picked up on the next session (or via `/agents`), and that they can tell you how an agent performed so it gets noted in the log.
