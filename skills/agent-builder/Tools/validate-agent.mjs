#!/usr/bin/env node
/**
 * validate-agent — checks Claude Code subagent files (.claude/agents/*.md).
 *
 * Usage: node validate-agent.mjs <file.md> [more.md ...]   (bun works too)
 * Exit 0 = all files pass (warnings allowed). Exit 1 = at least one error.
 * No dependencies. Requires Node 18+ or Bun.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const MODELS = ["haiku", "sonnet", "opus", "fable", "inherit"];
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const EDIT_TOOLS = ["Edit", "Write", "NotebookEdit"];

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
      out[key] = (out[key] ? out[key] + " " : "") + line.trim();
    }
  }
  return out;
}

function check(file) {
  const errors = [];
  const warnings = [];
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return { errors: ["cannot read file"], warnings };
  }
  const fm = parseFrontmatter(text);
  if (!fm) return { errors: ["no YAML frontmatter (--- block) at top of file"], warnings };

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

  if (!fm.tools) warnings.push("no `tools` set: the agent gets every tool, including Edit/Write");
  else {
    const tools = fm.tools.split(",").map((t) => t.trim());
    const canEdit = tools.some((t) => EDIT_TOOLS.includes(t));
    if (fm.model === "haiku" && canEdit)
      warnings.push("haiku agent can edit files; small models are best kept on read-only, easy-to-check work");
    if (!canEdit && tools.includes("Bash"))
      warnings.push("read-only agent has Bash, which can still change files; list allowed commands in its prompt");
    if (tools.includes("Agent"))
      warnings.push("has the Agent tool: only works when run as the main session (claude --agent <name>), since subagents can't start subagents");
  }

  if (["xhigh", "max"].includes(fm.effort ?? "") && fm.model !== "fable")
    warnings.push(`effort ${fm.effort} on ${fm.model}: compare against the next model up at medium`);

  const body = text.replace(/^---[\s\S]*?---/, "").trim();
  if (body.length < 20) errors.push("body (the agent's instructions) is empty or too short");

  return { errors, warnings };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node validate-agent.mjs <agent.md> [more.md ...]");
  process.exit(2);
}

let failed = false;
for (const f of files) {
  const { errors, warnings } = check(f);
  const status = errors.length ? "FAIL" : warnings.length ? "WARN" : "OK";
  console.log(`${status}  ${f}`);
  for (const e of errors) console.log(`  error:   ${e}`);
  for (const w of warnings) console.log(`  warning: ${w}`);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
