/**
 * ============================================================
 * OPTION A — Registry Check (Fast, no Discord API calls)
 * ============================================================
 * Scans all command files in src/commands/ (including subfolders),
 * validates their structure, and reports pass/fail for each.
 *
 * Usage: node checkRegistry.js
 * ============================================================
 */

const fs = require("fs");
const path = require("path");

// ─── CONFIG ────────────────────────────────────────────────
const COMMANDS_DIR = path.join(__dirname, "src", "commands");

// Required fields for slash commands
const SLASH_REQUIRED = ["data", "execute"];
// Required fields for prefix commands
const PREFIX_REQUIRED = ["name", "execute"];
// ────────────────────────────────────────────────────────────

const results = { pass: [], fail: [], warn: [] };

function getAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".ts")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function loadCommand(filePath) {
  // Clear require cache so re-runs are fresh
  delete require.cache[require.resolve(filePath)];
  const mod = require(filePath);
  // Support both module.exports = {} and export default {}
  return mod?.default ?? mod;
}

function validateCommand(cmd, filePath) {
  const relPath = path.relative(__dirname, filePath);
  const issues = [];
  const warnings = [];

  if (!cmd || typeof cmd !== "object") {
    return { pass: false, issues: ["File does not export a valid object"] };
  }

  const isSlash = !!cmd.data; // has a SlashCommandBuilder or similar
  const isPrefix = !!cmd.name && !cmd.data;

  if (isSlash) {
    // Slash command checks
    for (const field of SLASH_REQUIRED) {
      if (!cmd[field]) issues.push(`Missing required field: "${field}"`);
    }
    if (cmd.data && typeof cmd.data.toJSON !== "function" && typeof cmd.data !== "object") {
      issues.push('"data" should be a SlashCommandBuilder or plain object');
    }
    if (typeof cmd.execute !== "function") {
      issues.push('"execute" must be a function');
    }
    if (!cmd.description && !cmd.data?.description) {
      warnings.push("No description found");
    }
  } else if (isPrefix) {
    // Prefix command checks
    for (const field of PREFIX_REQUIRED) {
      if (!cmd[field]) issues.push(`Missing required field: "${field}"`);
    }
    if (typeof cmd.execute !== "function") {
      issues.push('"execute" must be a function');
    }
    if (!cmd.description) {
      warnings.push("No description found (recommended for top.gg)");
    }
  } else {
    issues.push("Cannot determine command type — missing both `data` (slash) and `name` (prefix)");
  }

  return { pass: issues.length === 0, issues, warnings, type: isSlash ? "slash" : "prefix" };
}

// ─── MAIN ──────────────────────────────────────────────────
console.log("\n\u{1F50D} Scanning commands in:", COMMANDS_DIR);
console.log("\u2500".repeat(60));

if (!fs.existsSync(COMMANDS_DIR)) {
  console.error("\u274C Commands directory not found:", COMMANDS_DIR);
  process.exit(1);
}

const files = getAllFiles(COMMANDS_DIR);
console.log("\u{1F4C1} Found " + files.length + " command file(s)\n");

for (const filePath of files) {
  const relPath = path.relative(__dirname, filePath);
  let cmd;

  try {
    cmd = loadCommand(filePath);
  } catch (err) {
    results.fail.push({ file: relPath, issues: ["Failed to load: " + err.message] });
    console.log("\u274C LOAD ERROR  " + relPath);
    console.log("   \u2514\u2500 " + err.message);
    continue;
  }

  const { pass, issues, warnings, type } = validateCommand(cmd, filePath);
  const typeLabel = type ? "[" + type + "]" : "[unknown]";

  if (pass) {
    results.pass.push({ file: relPath, type });
    const warnStr = warnings?.length ? " \u26A0\uFE0F  " + warnings.join(", ") : "";
    console.log("\u2705 PASS  " + (typeLabel + "        ").slice(0, 9) + " " + relPath + warnStr);
    if (warnings?.length) results.warn.push({ file: relPath, warnings });
  } else {
    results.fail.push({ file: relPath, issues });
    console.log("\u274C FAIL  " + (typeLabel + "        ").slice(0, 9) + " " + relPath);
    for (const issue of issues) {
      console.log("   \u2514\u2500 " + issue);
    }
  }
}

// ─── SUMMARY ───────────────────────────────────────────────
console.log("\n" + "\u2500".repeat(60));
console.log("\u{1F4CA} SUMMARY");
console.log("   \u2705 Passed  : " + results.pass.length);
console.log("   \u274C Failed  : " + results.fail.length);
console.log("   \u26A0\uFE0F  Warnings: " + results.warn.length);
console.log("\u2500".repeat(60));

if (results.fail.length > 0) {
  console.log("\n\u{1F6A8} Commands that need fixing:");
  for (const { file, issues } of results.fail) {
    console.log("\n  \u{1F4C4} " + file);
    for (const issue of issues) console.log("     \u2022 " + issue);
  }
}

if (results.pass.length === files.length) {
  console.log("\n\u{1F389} All commands passed registry check! Ready for top.gg.\n");
} else {
  console.log("\n\u26A0\uFE0F  Fix the " + results.fail.length + " failed command(s) above before submitting.\n");
}
