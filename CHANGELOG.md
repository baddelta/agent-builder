# Changelog

All notable changes to this plugin. Versions follow [semver](https://semver.org/).

## 1.5.0 — 2026-11-13

Ideas from ["Safely scaling multi-agent teams with Fable 5.2"](https://claude.dev/blog/safely-scaling-multi-agent-teams-with-fable-5-2/) (Barry Zhang, Tianyi Peng, Elle Najt, Keller Scholl, Lance Martin), plus fixes from rerunning the test requests.

- **Push back on "impossible":** leads and workflows ask what was tried and retry with more context, a different approach or a stronger model before reporting a task as blocked. New gotcha: agents give up too early.
- **Layered safety for unattended runs:** a fail-closed `PreToolUse` hook (it blocks only on exit code 2, so wrap it as `node check-command.mjs || exit 2`), whole-command matching that rejects chaining and outside paths, `git -C` only for read subcommands, allowed commands kept in a JSON file the checker can scan, members report blocked commands first and the lead then stops the run and leaves a `STOPPED` file that keeps later scheduled runs from starting, hook logs outside the project, no extra secrets in reach.
- **Progress log:** the team lead owns a log file (and gets `Write` for it) with one line per finished task, and builds its final counts from it.
- **Limits and conflicts:** at most a set number of members run at once; a merge conflict stops the run and is reported, never resolved by the lead.
- **Test fixes:** a workflow merges reviewed tasks into its own working branch (never the base), a build task is done when its own tests pass and it's reviewed with the full suite after merging, the lead stays on the feature branch while dispatching builders and each builder checks with `git log` that the tests are in its worktree, and a trial run continues from where it stopped.

## 1.4.2 — 2026-11-11

Fixes from rerunning the four test requests (now saved in `tests/requests.md`) until they came back clean. From this release on, every release runs them first.

- **Decide the shape first:** Step 0 now starts with "nothing, a workflow, or agent files" before any questions.
- **Workflows:** the orchestrator runs on `opus` (`fable` only when the plan itself is hard). The workflow creates its own working branch, commits the contract and tests there, and leaves reviewed branches unmerged for the user, since a running workflow can't stop to ask. Tasks are split by file, with shared files owned by the contract step. The budget is scaled from a trial run and is a target, not a hard limit. The build-log line records each step's model and effort.
- **Quarantine:** the actor's work still gets a reviewer on a different model. The quarantine lead has its own tool list and model (`opus`), starts from the newest item on its first run, and prefers a read-only connector over `WebFetch` for structured data. Permissions cover the whole run (commands, edit folders, MCP tools), need a hand-run before scheduling, and `--max-turns` is a rough cap.
- **Teams:** the lead creates a user-approved feature branch. Every member that edits runs in its own worktree, builders commit on task branches and report branch, path and commit to the reviewer, and builders' worktrees start from the branch with the merged tests. Dependencies may need installing in new worktrees. Test and contract tasks have their own done rules, and any task done on the reviewer's model (including the architect's contract) is reviewed on another. The scout is the built-in `Explore` on `haiku`, not a member. The test engineer runs on `sonnet` at `medium`. Tiny/small/large sizing, and a default scope of "change as little as possible".
- **Template:** every fill-in field is now in capitals so the checker sees it.
- **Checker:** flags leftover template instruction lines and placeholders with hints (`[SHARED FILES, e.g. src/]`), lists every placeholder with a count, checks `.json` settings files for placeholders, and has fewer false "asks it to edit" hints (`should-fix`, "the change has", "can't edit", "doesn't fix").

## 1.4.1 — 2026-11-11

Fixes from running four test requests on 1.4.0 (a one-time migration, a nightly public-issue fixer, a reusable feature team, a one-line typo fix). All four made the right top-level call; these tighten the details.

- **Contradictions removed:** the worked team example is now a reusable team, with new examples for a one-time job (workflow) and a too-small job (just do it). A builder escalated to the reviewer's model gets reviewed on another model. The lead template's shutdown line now matches how subagents end.
- **Quarantine wiring:** the reader and actor always run under a lead launched as the main session, which also keeps the bookmark and run record. Summaries use fixed fields, fixed-list values, paraphrased and length-capped text, and a `suspicious` flag. The reader gets no `Read` tool.
- **Unattended leads:** with nobody to ask, the default is no push, no merge, no public posting; things are left for a person and noted in the run record. Permissions are set before a headless run.
- **Reusable teams:** the lead template has a goal line for "whatever feature you're given", a sizing step that keeps small changes off the full team, `opus` as the default lead for mixed-size teams, `git merge` after approval, a work order (contract, tests, builders), and no failing-test-first rule for pure styling or copy changes. Team size excludes the lead.
- **Workflow path:** says which team rules carry over, suggests a trial run on a small slice to set the budget, and logs the recommendation. When asked for an agent a job doesn't need, the skill does the job and offers the agent.
- **Checker:** recognizes `claude -p --agent`; ignores "read-only" said about another agent or when an `Owns:` line names files; new warning for unfilled placeholders (`[TEST COMMAND]`, `<<...>>`, `{{...}}`).

## 1.4.0 — 2026-11-11

Ideas from ["A harness for every task: dynamic workflows in Claude Code"](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/) (Thariq Shihipar and Sid Bidasaria).

- **Agent files or a workflow:** the skill now asks whether a job repeats. Repeating jobs get saved agents. A large one-time job (migration, checking every claim, deep research, ranking hundreds of items) gets a suggested workflow prompt instead, with a warning about token use. Routine coding gets neither.
- **Why teams split work:** team design now targets three ways one long session fails (stopping partway, going easy on its own work, drifting from the goal). Leads account for every task by count, and work of unknown size runs until a round finds nothing new.
- **Quarantine:** an agent that reads untrusted content and also acts is split into a reader with no write tools and an actor that only sees structured summaries. The audit flags agents that do both. The checker adds a `check:` line for agents with web tools plus Edit, Write or Bash.
- **Scout first:** a cheap `haiku` scout can size tasks before the lead picks `sonnet` or `opus`. Parallel builders use the narrowest command that proves their task.
- **Bulk ranking:** compare two items at a time instead of scoring each alone.

## 1.3.1 — 2026-11-11

Fixes from rerunning the migration-team test on 1.3.0.

- Teams: the lead relays messages between members (plain subagents can't message each other); the lead asks before merging each reviewed worktree; one builder file run many times owns "only the files named in your task"; tests must fail before the code exists; an architect role defaults to `opus` at `high`; `sonnet` builders are fine for migrations only with per-task tests and a stronger reviewer.
- Cascade: the lead re-dispatches a failing task on a stronger model through the Agent tool's `model` setting, instead of needing a separate `-strong` agent file.
- Placeholders: when repo facts like the test command can't be read, they're marked and listed for the user to confirm.
- Checker: warnings can now be explained as intended rather than always "fixed"; no Agent-tool warning when the file already says to run it with `claude --agent`; "Bash is only for:" counts as listing allowed commands.

## 1.3.0 — 2026-11-11

Team and bulk-job rules from two shared images: "The Fully Loaded Claude Code Setup" (@Voxyz_ai) and the "Fable 5.2 Coding Agent Team Prompting Guide" (author not named). Credits in the README.

- **Teams:** 3–5 members, added only for truly parallel work; one owner per file, with shared files owned by the lead or architect; parallel builders in separate git worktrees; a read-only reviewer with fresh context on a different model than the builders; a lead that coordinates instead of coding; tasks complete only when tests pass and the reviewer has checked them.
- **New `TeamLeadTemplate.md`:** a fill-in prompt for team leads.
- **Agent instructions** now include `Owns` (the files it may change) and `Done` (the check that proves it's finished), and `Output` is now `Reports`.
- **Bulk jobs:** for the same task over thousands of items, the skill suggests a Batch API script on Haiku (about half price) tested on ~50 items first, instead of an agent.
- **Checker:** new hints for editing agents with no `Owns` line and agents with no `Done` check. The Bash warning no longer fires when the agent lists the commands it may run.

## 1.2.0 — 2026-11-11

Checker upgrades, closing a limit listed in 1.1.0.

- **Tool-name spelling:** tools are checked against Claude Code's built-in tool list, with "did you mean" suggestions (`Grepp` → `Grep`, `bash` → `Bash`). MCP tools are checked for the `mcp__<server>__<tool>` shape. Unknown names are warnings, so brand-new tools don't break anything.
- **Instructions vs tools:** new `check:` hints when the instructions ask for something the tools can't do (edit files, run commands, use the web, dispatch agents), when an agent says it's read-only but has Edit/Write, and when the honest-reporting rule is missing. Phrases like "don't edit X" or "the run crashed" don't trigger them.
- Tools written as YAML lists (`- Read`) or with patterns (`Bash(git diff:*)`) are now parsed correctly.
- CreateAgent now has Claude reread each agent against its tools after the checker runs, to catch what keywords miss.

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
