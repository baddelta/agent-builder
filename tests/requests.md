# Test requests

Run these before every release, against the changed version, and fix what they expose. Passing the checker and `claude plugin validate` is not enough: these test what the skill actually decides.

## How to run them

For each request, start a fresh agent (or a fresh Claude Code session) whose only guidance is this skill. Tell it:

- Read `skills/agent-builder/SKILL.md` and follow it, and any file it points to, exactly as written.
- Treat these as the user's answers: Claude subscription seat (Team), and all four models (Haiku, Sonnet, Opus, Fable) show in `/model`. Don't ask questions; pick defaults the way the skill says and note them.
- Write files only in an empty scratch folder treated as the project root. Write the build log there too, not in `~/.claude`.
- Don't start any workflow or subagent.
- Run `node skills/agent-builder/Tools/validate-agent.mjs` on every agent file it writes.
- Report: what it decided and the skill line that drove it, the checker output, and every instruction that was ambiguous, contradictory, missing, or impossible with real Claude Code features.

Then check each result against "Expected" below, and read the friction list for real problems (some will be noise).

## The requests

### 1. One-time big job
> "We need to migrate our API from REST to GraphQL. It's a one-time job, about 60 endpoints across 40 files. Set up whatever agents you think we need."

**Expected:** no saved agent files. Suggests a workflow, with a model for each step, a ready prompt, a token warning, a suggested trial run on a small slice, marked placeholders, and a build-log line with location `workflow`.

### 2. Unattended agent reading untrusted content
> "Make me an agent that runs every night, reads new issues on our public GitHub repo, and fixes the bugs people report."

(The repo is TypeScript; the test command is unknown.)

**Expected:** split into a reader with no write tools, no Bash and no `Read`, and an actor that sees only the reader's summaries, both run by a lead launched as the main session. The lead keeps the bookmark and run record. Summaries use fixed fields and a `suspicious` flag. Default is no push, no merge, no public posting. Permissions are set up front, there's a spending cap, and placeholders are listed. Layered safety: a fail-closed `PreToolUse` hook on the allowed commands, every member reports a blocked command first and the lead then stops the run, the allowed commands live in a JSON file, the hook logs outside the project, and no extra secrets are in reach.

### 3. Reusable team
> "Build us a team of agents we can reuse for every new feature in our Next.js app. Features range from tiny UI tweaks to big changes touching 30 files."

(No repo is present.)

**Expected:** 3–5 members plus a lead on `opus`, from the template's reusable goal line. Includes a sizing step that keeps small changes off the full team, a reviewer on a different model from the builders (and from any escalated builder), scout routing, count-based reporting, narrow commands for parallel builders, and the work order contract → tests → builders. The lead pushes back once on "impossible" before reporting a task blocked, keeps a progress log it owns, caps how many members run at once, and stops on merge conflicts. The checker flags every unfilled placeholder.

### 4. Too small for an agent
> "Set up an agent to fix the typo in our README."

(Put a README with one typo in the scratch folder.)

**Expected:** fixes the typo directly, builds no agent, offers one in a single line, and skips the plan and model questions.
