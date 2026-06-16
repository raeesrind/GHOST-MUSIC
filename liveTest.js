/**
 * ============================================================
 * OPTION B — Live Execution Test
 * ============================================================
 * Uses a tester bot (can be your main bot or a second account)
 * to send each command in a private test channel and waits
 * for a response. Logs pass/fail per command.
 *
 * Setup:
 *  1. Create a .env file (or fill CONFIG below) with:
 *       TESTER_TOKEN   = bot token that SENDS commands
 *       BOT_ID         = your main bot's user ID (to listen for)
 *       TEST_CHANNEL   = channel ID to run tests in
 *       PREFIX         = your bot's prefix (e.g. !)
 *
 *  2. Install deps if needed: npm install discord.js dotenv
 *  3. Run: node liveTest.js
 *
 * NOTE: The tester bot needs SEND_MESSAGES + READ_MESSAGE_HISTORY
 *       in the test channel. Your main bot must be online.
 * ============================================================
 */

require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const fs   = require("fs");
const path = require("path");

// ─── CONFIG ────────────────────────────────────────────────
function resolveTesterToken() {
  if (process.env.TESTER_TOKEN && process.env.TESTER_TOKEN !== "YOUR_TESTER_BOT_TOKEN") {
    return process.env.TESTER_TOKEN;
  }
  try {
    const rootConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
    const botId = parseInt(process.env.GHOST_BOT_ID) || 1;
    const botConfig = rootConfig.subBots?.find(b => b.id === botId);
    if (botConfig?.token) return botConfig.token;
  } catch (e) { }
  return "YOUR_TESTER_BOT_TOKEN";
}

const CONFIG = {
  testerToken : resolveTesterToken(),
  botId       : process.env.BOT_ID        || "YOUR_MAIN_BOT_USER_ID",
  channelId   : process.env.TEST_CHANNEL  || "YOUR_TEST_CHANNEL_ID",
  prefix      : process.env.PREFIX        || ".",
  commandsDir : path.join(__dirname, "src", "commands"),
  timeoutMs   : 5000,   // ms to wait for bot response per command
  delayMs     : 1500,   // ms between sending each command (avoid rate limits)
};
// ────────────────────────────────────────────────────────────

const results = { pass: [], fail: [], skip: [] };

// ── Gather all command files ────────────────────────────────
function getAllFiles(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) getAllFiles(full, list);
    else if (entry.name.endsWith(".js")) list.push(full);
  }
  return list;
}

function loadCommands() {
  const files = getAllFiles(CONFIG.commandsDir);
  const cmds = [];
  for (const f of files) {
    try {
      const mod = require(f);
      const cmd = mod?.default ?? mod;
      if (cmd && (cmd.name || cmd.data?.name)) {
        cmds.push({
          name       : cmd.name || cmd.data?.name,
          isSlash    : !!cmd.data,
          file       : path.relative(__dirname, f),
          // Try to get a safe "no-arg" invocation — extend this per command
          testInput  : cmd.testInput || null,
        });
      }
    } catch (e) {
      results.skip.push({ name: f, reason: "Load error: " + e.message });
    }
  }
  return cmds;
}

// ── Wait for bot reply in channel ──────────────────────────
function waitForReply(client, channelId, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      client.off("messageCreate", handler);
      resolve(null); // timeout = no response
    }, timeoutMs);

    function handler(msg) {
      if (msg.channelId === channelId && msg.author.id === CONFIG.botId) {
        clearTimeout(timer);
        client.off("messageCreate", handler);
        resolve(msg);
      }
    }
    client.on("messageCreate", handler);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  const commands = loadCommands();
  console.log("\n\u{1F916} Loaded " + commands.length + " commands to test");
  console.log("\u{1F4E1} Test channel: " + CONFIG.channelId);
  console.log("\u23F1  Timeout per command: " + CONFIG.timeoutMs + "ms\n");
  console.log("\u2500".repeat(60));

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  await client.login(CONFIG.testerToken);
  await new Promise((r) => client.once("ready", r));
  console.log("\u2705 Tester bot logged in as " + client.user.tag + "\n");

  const channel = await client.channels.fetch(CONFIG.channelId);
  if (!channel) {
    console.error("\u274C Could not fetch test channel. Check TEST_CHANNEL in config.");
    process.exit(1);
  }

  for (const cmd of commands) {
    let invocation;

    if (cmd.isSlash) {
      // Slash commands: send as text trigger for the tester
      // (Actual slash invocation requires a user — use prefix alias if available)
      invocation = CONFIG.prefix + cmd.name + (cmd.testInput ? " " + cmd.testInput : "");
      console.log("\u26A1 [slash\u2192prefix fallback] Testing: /" + cmd.name);
    } else {
      invocation = CONFIG.prefix + cmd.name + (cmd.testInput ? " " + cmd.testInput : "");
      console.log("\u{1F524} [prefix] Testing: " + invocation);
    }

    try {
      await channel.send(invocation);
      const reply = await waitForReply(client, CONFIG.channelId, CONFIG.timeoutMs);

      if (reply) {
        results.pass.push({ name: cmd.name, type: cmd.isSlash ? "slash" : "prefix" });
        console.log("   \u2705 PASS \u2014 bot replied");
      } else {
        results.fail.push({ name: cmd.name, reason: "No response within timeout" });
        console.log("   \u274C FAIL \u2014 no response (timeout)");
      }
    } catch (err) {
      results.fail.push({ name: cmd.name, reason: err.message });
      console.log("   \u274C ERROR \u2014 " + err.message);
    }

    await sleep(CONFIG.delayMs);
  }

  // ── Summary ──────────────────────────────────────────────
  console.log("\n" + "\u2500".repeat(60));
  console.log("\u{1F4CA} LIVE TEST SUMMARY");
  console.log("   \u2705 Passed : " + results.pass.length);
  console.log("   \u274C Failed : " + results.fail.length);
  console.log("   \u23ED  Skipped: " + results.skip.length);

  if (results.fail.length > 0) {
    console.log("\n\u{1F6A8} Failed commands:");
    for (const { name, reason } of results.fail) {
      console.log("   \u2022 " + name + " \u2014 " + reason);
    }
  }
  if (results.skip.length > 0) {
    console.log("\n\u26A0\uFE0F  Skipped (load errors):");
    for (const { name, reason } of results.skip) {
      console.log("   \u2022 " + name + " \u2014 " + reason);
    }
  }

  console.log("\n\u2714  Test run complete. Destroying tester client...\n");
  await client.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
