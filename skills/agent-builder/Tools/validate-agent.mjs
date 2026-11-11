#!/usr/bin/env node
/**
 * validate-agent — checks Claude Code subagent files (.claude/agents/*.md).
 *
 * Usage: node validate-agent.mjs <file.md> [more.md ...]   (bun works too)
 * Exit 0 = all files pass (warnings allowed). Exit 1 = at least one error.
 * No dependencies. Requires Node 18+ or Bun.
 *
 * Checks: frontmatter fields, model and effort values, tool-name spelling,
 * keyword hints that an agent's instructions don't match its tools, and
 * agents that read the web while holding write tools (quarantine hint), and
 * unfilled placeholders like [TEST COMMAND].
 * The keyword hints are heuristics: they can miss mismatches and can flag
 * false ones, so they are reported as "check:" lines, never errors.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const MODELS = ["haiku", "sonnet", "opus", "fable", "inherit"];
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const EDIT_TOOLS = ["Edit", "Write", "NotebookEdit", "MultiEdit"];
const WEB_TOOLS = ["WebFetch", "WebSearch"];

// Claude Code built-in tools as of 2026-11. New tools appear over time, so an
// unknown name is a warning, not an error. Update this list as tools change.
const KNOWN_TOOLS = [
  "Agent", "Task", "AskUserQuestion", "Bash", "BashOutput", "Edit", "EnterPlanMode",
  "EnterWorktree", "ExitPlanMode", "ExitWorktree", "Glob", "Grep", "KillShell",
  "ListAgents", "LSP", "Monitor", "MultiEdit", "NotebookEdit", "NotebookRead",
  "PushNotification", "Read", "SendMessage", "Skill", "SlashCommand", "TaskStop",
  "TodoWrite", "ToolSearch", "WebFetch", "WebSearch", "Workflow", "Write",
  "CronCreate", "CronDelete", "CronList", "ScheduleWakeup", "RemoteTrigger",
];

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  let key = "";
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      // `>` / `|` block scalars: the value continues on indented lines below
      out[key] = /^[>|][+-]?$/.test(kv[2].trim()) ? "" : kv[2].trim().replace(/^["']|["']$/g, "");
    } else if (key && /^\s+\S/.test(line)) {
      const piece = line.trim().replace(/^-\s+/, ""); // YAML list items
      out[key] = out[key] ? `${out[key]}, ${piece}` : piece;
    }
  }
  return out;
}

/** Split a tools value into base names: "Read, Bash(git diff:*), [Grep]" -> ["Read","Bash","Grep"] */
function parseTools(value) {
  return value
    .replace(/^\[|\]$/g, "")
    .split(/,(?![^(]*\))/) // commas outside parentheses
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .map((t) => ({ raw: t, base: t.replace(/\(.*\)$/, "").trim() }));
}

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function suggest(name) {
  const lower = name.toLowerCase();
  const exactCase = KNOWN_TOOLS.find((k) => k.toLowerCase() === lower);
  if (exactCase) return exactCase;
  let best = null;
  let bestD = 3;
  for (const k of KNOWN_TOOLS) {
    const dd = distance(lower, k.toLowerCase());
    if (dd < bestD) [best, bestD] = [k, dd];
  }
  return best;
}

function checkToolNames(tools, warnings) {
  for (const { raw, base } of tools) {
    if (base.startsWith("mcp__")) {
      if (!/^mcp__[A-Za-z0-9_.-]+(__[A-Za-z0-9_.*-]+)?$/.test(base))
        warnings.push(`tool "${raw}" doesn't look like a valid MCP tool name (mcp__<server>__<tool>)`);
      continue;
    }
    if (KNOWN_TOOLS.includes(base)) continue;
    const s = suggest(base);
    warnings.push(
      s ? `unknown tool "${raw}": did you mean "${s}"?` : `unknown tool "${raw}" (not a known built-in tool; fine if it is new or custom)`,
    );
  }
}

// ---- instructions vs tools (keyword heuristics) ----

const NEGATION = /\b(don'?t|doesn'?t|do not|does not|never|no|not|without|avoid|must not|mustn'?t|can'?t|cannot|won'?t|shouldn'?t|isn'?t)\b/;
const PLACEHOLDER = /\[[A-Z][A-Z0-9 _/'.,:-]{2,}(?:\]|[,(;][^\]\n]*\])(?!\()|<<[^<>\n]+>>|\{\{[^{}\n]+\}\}|^\s*[-*]?\s*\[[A-Z][^\]\n]{15,}\](?!\()/gm;

function findPlaceholders(text) {
  return [...new Set(text.match(PLACEHOLDER) ?? [])]
    .map((h) => h.trim().replace(/^[-*]\s*/, ""))
    .map((h) => (h.length > 32 ? `${h.slice(0, 29)}...` : h));
}

/** Sentences (and bullet lines) of the body, lowercased, with code fences kept as text. */
function sentences(body) {
  return body
    .toLowerCase()
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True if some non-negated sentence matches `re`. */
function asksFor(sents, re) {
  return sents.some((s) => re.test(s) && !NEGATION.test(s));
}

function checkInstructions(body, tools, checks) {
  const names = new Set(tools.map((t) => t.base));
  const has = (list) => list.some((t) => names.has(t));
  const sents = sentences(body);
  const text = body.toLowerCase();

  // Verb uses only: not "should-fix", not "the change has behavior to test".
  const EDIT_ASK =
    /(?<![-\w])(?<!\b(the|a|an|this|that|each|any|no|every) )(edit|modify|fix|update|refactor|rewrite|implement|patch|change|create|write)\b[^.]{0,40}\b(files?|code|tests?|resolvers?|functions?|handlers?|the bug|it)\b|\bapply (the )?(fix|change|patch)/;
  if (!has(EDIT_TOOLS) && asksFor(sents, EDIT_ASK))
    checks.push("instructions ask it to change files or code, but it has no Edit/Write tool");

  // A blanket claim about itself ("you are read-only", "never edit any files"),
  // not a scoped one ("don't edit shared schema files") or a remark about
  // another agent ("`explorer` (cheap, read-only)").
  const READ_ONLY_CLAIM =
    /(^|\n|[.:]\s*)read[- ]only\b|\b(you are|you're|stay|remain|be|work|agent is) read[- ]only\b|\b(never|don'?t|do not)\s+(edit|modify|write|change)\s+(any(thing| files?| code| source)?|files|code)\b/;
  // Lines that name another agent in backticks (`fix-reviewer` (opus): read-only)
  // describe that agent, not this one.
  const ownLines = text.split("\n").filter((l) => !/`[a-z0-9]+(-[a-z0-9]+)+`/.test(l)).join("\n");
  // An "Owns:" line naming real files means "don't write code" is scoped, not read-only.
  const ownsFiles = /(^|\n)\s*[-*]?\s*\**owns\**:\s*(?!nothing|none|no files)\S/.test(text);
  if (has(EDIT_TOOLS) && !ownsFiles && READ_ONLY_CLAIM.test(ownLines))
    checks.push("instructions say read-only / don't edit, but it has Edit/Write; remove those tools if it truly only reads");

  const RUN_ASK =
    // "run" as a verb ("run the tests"), not a noun ("the run crashed")
    /(?<!\b(the|a|each|every|this|that|last|next|normal) )\b(run|execute|re-?run)\s+(the |your |a |all |any |its |this |that |these )?([\w`'-]+\s)?(tests?|command|script|build|suite|linter|type-?check)\b|`(git|gh|npm|npx|bun|pnpm|yarn|pytest|make|node|python|cargo|go)\b|\b(git|gh) (diff|log|status|show|pr|issue|blame)\b/;
  if (!names.has("Bash") && asksFor(sents, RUN_ASK))
    checks.push("instructions ask it to run commands (tests, git, gh, scripts), but it has no Bash tool");

  const WEB_ASK =
    /\b(search the web|web search|look (it )?up online|fetch (the )?(url|page|site)|browse|website|web ?page)\b|https?:\/\/\S+/;
  if (!has(WEB_TOOLS) && asksFor(sents, WEB_ASK))
    checks.push("instructions mention the web or URLs, but it has no WebFetch/WebSearch tool (ignore if the URLs are only references)");

  const AGENT_ASK = /\b(dispatch|delegate|hand (it|them|work) (off|out)|subagents?|worker agents?|your workers)\b|\bcall (the )?`?[a-z0-9-]+`? agent\b/;
  if (!names.has("Agent") && !names.has("Task") && asksFor(sents, AGENT_ASK))
    checks.push("instructions talk about dispatching other agents, but it has no Agent tool");

  // Quarantine: an agent that reads the web and can also change things is the
  // easiest target for planted instructions. Fine if every source is trusted.
  if (has(WEB_TOOLS) && (has(EDIT_TOOLS) || names.has("Bash")) && !/\bquarantine|trusted sources? only\b/.test(text))
    checks.push("reads the web and can also edit files or run commands; if it reads untrusted content, split it into a reader (no write tools) and an actor that sees only the reader's summaries");

  const HONEST =
    /\b(can'?t|cannot|couldn'?t|unable to|fails? to)\b[^.]{0,30}\b(find|read|access|reach|open|load|run)\b|\bsay so\b|\bfailed reads?\b|\breport (the|that|it as a) (failure|gap|error)/;
  const OWNS = /\bowns?\b|\bmay (edit|change|touch)\b|\bonly (edit|change|touch)\b|\byour (own )?files\b|\bfiles for your\b/;
  if (has(EDIT_TOOLS) && !OWNS.test(text))
    checks.push("can edit files but doesn't say which ones it owns (add an \"Owns:\" line so parallel agents don't collide)");

  const DONE = /(^|\n)\s*done\b[^\n]{0,3}:|\bdone (means|when)\b|\bcomplete only when\b|\bfinished when\b|\bmust pass\b|\buntil it passes\b/;
  if (!DONE.test(text))
    checks.push("no \"Done:\" check found (the concrete test or check that proves the work is finished)");

  if (!HONEST.test(text))
    checks.push("no honest-reporting rule found (e.g. \"if you can't read a source, say so; never report it as nothing found\")");
}

function check(file) {
  const errors = [];
  const warnings = [];
  const checks = [];
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return { errors: ["cannot read file"], warnings, checks };
  }
  // Settings files (.claude/settings.json): only check for unfilled placeholders.
  if (file.endsWith(".json")) {
    try {
      JSON.parse(text);
    } catch {
      errors.push("not valid JSON");
    }
    const holes = findPlaceholders(text);
    if (holes.length) warnings.push(`${holes.length} unfilled placeholder${holes.length > 1 ? "s" : ""}: ${holes.join(", ")}`);
    return { errors, warnings, checks };
  }

  const fm = parseFrontmatter(text);
  if (!fm) return { errors: ["no YAML frontmatter (--- block) at top of file"], warnings, checks };

  const expected = basename(file).replace(/\.md$/, "");
  if (!fm.name) errors.push("missing `name`");
  else if (fm.name !== expected) warnings.push(`name "${fm.name}" differs from filename "${expected}"`);

  if (!fm.description) errors.push("missing `description` (Claude uses it to decide when to call the agent)");
  else if (fm.description.length < 30) warnings.push("description is very short; say what it does and when to use it");

  if (!fm.model) warnings.push("no `model` set: agent inherits the session model, often the most expensive choice");
  else if (!MODELS.includes(fm.model) && !fm.model.startsWith("claude-"))
    errors.push(`unknown model "${fm.model}" (use ${MODELS.join(", ")} or a full claude-* ID)`);

  if (!fm.effort) warnings.push("no `effort` set: write it out so it's visible and easy to change");
  else if (!EFFORTS.includes(fm.effort))
    errors.push(`unknown effort "${fm.effort}" (use ${EFFORTS.join(", ")})`);

  const body = text.replace(/^---[\s\S]*?---/, "").trim();
  if (body.length < 20) errors.push("body (the agent's instructions) is empty or too short");

  if (!fm.tools) warnings.push("no `tools` set: the agent gets every tool, including Edit/Write");
  else {
    const tools = parseTools(fm.tools);
    const names = tools.map((t) => t.base);
    checkToolNames(tools, warnings);
    const canEdit = names.some((t) => EDIT_TOOLS.includes(t));
    if (fm.model === "haiku" && canEdit)
      warnings.push("haiku agent can edit files; small models are best kept on read-only, easy-to-check work");
    const listsCommands = /\b(may run|only run|allowed commands|commands you may|you can run|bash is only for|only for:)/i.test(body);
    if (!canEdit && names.includes("Bash") && !listsCommands)
      warnings.push("read-only agent has Bash, which can still change files; list allowed commands in its prompt");
    // Fine when the file already says to run it as the main session.
    if ((names.includes("Agent") || names.includes("Task")) && !/\bclaude\b[^\n`]*--agent\b/.test(text))
      warnings.push("has the Agent tool: only works when run as the main session (claude --agent <name>), since subagents can't start subagents");
    if (body.length >= 20) checkInstructions(body, tools, checks);
  }

  // Unfilled placeholders: [TEST COMMAND], <<FILL ME>>, {{name}}
  // plus template instruction lines left in: "[If this lead runs unattended: ...]"
  const holes = findPlaceholders(text);
  if (holes.length)
    warnings.push(`${holes.length} unfilled placeholder${holes.length > 1 ? "s" : ""}: ${holes.join(", ")} (not ready to use until filled in)`);

  if (["xhigh", "max"].includes(fm.effort ?? "") && fm.model !== "fable")
    warnings.push(`effort ${fm.effort} on ${fm.model}: compare against the next model up at medium`);

  return { errors, warnings, checks };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node validate-agent.mjs <agent.md> [more.md ...]");
  process.exit(2);
}

let failed = false;
for (const f of files) {
  const { errors, warnings, checks } = check(f);
  const status = errors.length ? "FAIL" : warnings.length || checks.length ? "WARN" : "OK";
  console.log(`${status}  ${f}`);
  for (const e of errors) console.log(`  error:   ${e}`);
  for (const w of warnings) console.log(`  warning: ${w}`);
  for (const c of checks) console.log(`  check:   ${c}`);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
