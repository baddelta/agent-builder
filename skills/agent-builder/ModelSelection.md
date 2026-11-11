# Model Selection Reference

**Source:** Addy Osmani, ["Which Claude model should you build with?"](https://claude.dev/blog/which-claude-model-should-you-build-with/), claude.dev blog (Anthropic). This file is a summary in our own words, not a copy. Read the original for the full reasoning and benchmark details.

**Snapshot date:** 2026-11-11. Prices are Claude API list prices and will drift. Re-check before quoting exact numbers.

**On a subscription seat** (Pro, Max, Team, Enterprise), these per-token prices don't show up on a bill. Use them as a guide to how quickly each model uses up the plan's limits: Fable ≈ 2× Opus ≈ 4× Sonnet, and Haiku is far cheaper still.

## The four models

| | Haiku 5.5 | Sonnet 5.5 | Opus 5.5 | Fable 5.2 |
|---|---|---|---|---|
| Alias in agent files | `haiku` | `sonnet` | `opus` | `fable` |
| Built for | High-volume, cost-sensitive work | Fast, capable, well-scoped work | Daily driver for complex coding and knowledge work | Hardest, most open-ended technical work |
| Speed | Fastest | Fast | Moderate | Moderate |
| Input / output per 1M tokens | $0.10 / $0.50 (≤100K prompt); $0.50 / $2.50 (>100K) | $2 / $10 | $4 / $20 | $8 / $40 |
| Cache reads per 1M | $0.01 (≤100K); $0.05 (>100K) | $0.10 | $0.20 | $0.20 |
| Default effort in Claude Code | `medium` | `medium` | `medium` | `medium` |

All four have a 1M-token context window and 128K max output.

## Default and when to move

- **Start at `opus` + `medium`** when unsure.
- **Move down to `sonnet`** for well-scoped work: bug fixes, features built from a spec, repeated review/drafting/investigation. A clear spec alone isn't enough, though. Migrations and performance work stay hard even with a spec. Inside a team, `sonnet` builders are still fine for migration tasks when each task has a test it must pass and a stronger reviewer (see the Teams section of `Workflows/CreateAgent.md`).
- **Move down to `haiku`** for the simplest high-volume work (classify, route, tag, extract) and for side tasks whose output is cheap to check.
- **Move up to `fable`** for major refactors, migrations, architecture planning, leading many subagents, deep research, scientific or quantitative analysis, long unattended runs, or when `opus` at `high` still falls short.
- **Interactive/chat agents** a person waits on: `sonnet` at `low` or `medium` (haiku for simple high-volume chat).

## Effort

Effort is a finer, cheaper dial than switching models. Rough numbers for Opus on a coding benchmark, relative to `high`:
- `medium`: ~2.5 points lower, ~70% of the cost
- `low`: ~8 points lower, ~1/3 of the cost
- `xhigh`: ~1.4 points higher, ~2.5× the cost

So past `high`, try the next model up at a lower effort before going further.

## Escalation order when an agent isn't good enough

1. Give it a way to check its own work (a test, a build, a script). Usually cheaper than more effort.
2. Raise effort one level.
3. Move to the next model up, starting at a lower effort than the smaller model used.

**Cascade pattern:** if results can be checked automatically, run everything at `low` and re-run only the failures at `high`. In the article's test this passed more tasks for about 40% less money than running everything at `high`.

## Teams of agents

- **Subagents** run in their own context and return a summary. You pay their tokens at their model's rate. That makes them the place to put verbose reading (logs, big files, search) on a cheap model, which keeps the expensive model's context small.
- **Keep on cheap models:** finding files, running tests, reading logs, summarizing.
- **Keep on the main/strong model:** judgment calls, and code edits that have no test or checker behind them. Scoped edits with a test the worker must pass can go to `sonnet`; that is how the orchestrator pattern below saves money.
- **Orchestrator + workers:** a strong lead (`opus` or `fable`) splits work too big for one context window and hands pieces to many cheaper workers (`sonnet`) in parallel. In the article's test, an Opus lead with up to 25 Sonnet workers cost about a third less than Opus alone for the same score. Skip this for a single chain of dependent steps or work that fits in one context.
- **Custom Explore:** the built-in Explore agent runs on the session's model. A user-defined agent named `Explore` with `model: haiku` makes exploration cheap.
- `CLAUDE_CODE_SUBAGENT_MODEL` sets the default model for subagents that don't set one.
- When the routing is simple (one model per step type), let code or the agent file choose the model rather than asking a model to decide at run time.

## Bulk jobs: maybe not an agent at all

When the job is the same small task over many items with nobody waiting (classify 50,000 tickets, tag a product catalog, extract fields from a folder of documents), a subagent is usually the wrong tool. A short script that calls the Claude API is cheaper and easier to rerun, and Anthropic's **Batch API** processes requests asynchronously at about half the normal price (per the setup map credited in the README; check current pricing).

- **Model:** `haiku` at `medium` is the usual starting point (see the table above).
- **Test small first:** run the prompt on about 50 items, check those results by hand, fix the prompt, and only then run the full set. Mistakes on 50 rows are cheap; mistakes on 50,000 are not.
- **What the skill does:** offer to write the script and the 50-item check instead of an agent file, and say why.

## Cost thinking

- Higher price per token doesn't always mean higher cost per task. A stronger model can finish in fewer tokens.
- Price the hardest tasks, not just typical ones. In one benchmark, 2 of 20 problems were 43% of the spend.
- Haiku's advantage is biggest on short prompts. For agents that always read long inputs, compare cost per finished task.

## Measuring (when the user wants proof)

1. Pick a few real tasks, each with a pass/fail check.
2. Run each candidate model at 2–3 effort levels, in separate sessions.
3. Compare score against cost. Keep a multi-model setup only if it beats every single-model option.
4. Quick version in Claude Code: run one task on two models with `/model`, compare in `/usage`.
