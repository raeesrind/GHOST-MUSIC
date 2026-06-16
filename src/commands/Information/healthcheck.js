const { SlashCommandBuilder, EmbedBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const COMMANDS_DIR = path.join(__dirname, "..");

function getAllFiles(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) getAllFiles(full, list);
    else if (entry.name.endsWith(".js")) list.push(full);
  }
  return list;
}

function checkCommands(filterType = "all") {
  const files = getAllFiles(COMMANDS_DIR);
  const pass = [], fail = [], warn = [];

  for (const f of files) {
    const relPath = path.relative(COMMANDS_DIR, f);
    if (path.resolve(f) === path.resolve(__filename)) continue;

    let cmd;
    try {
      delete require.cache[require.resolve(f)];
      const mod = require(f);
      cmd = mod?.default ?? mod;
    } catch (e) {
      fail.push({ name: relPath, reason: "Load error: " + e.message });
      continue;
    }

    if (!cmd || typeof cmd !== "object") {
      fail.push({ name: relPath, reason: "No valid export" });
      continue;
    }

    const isSlash  = !!cmd.data;
    const isPrefix = !!cmd.name && !cmd.data;
    const type     = isSlash ? "slash" : isPrefix ? "prefix" : "unknown";
    const name     = cmd.name || cmd.data?.name || relPath;

    if (filterType !== "all" && filterType !== type) continue;

    const issues = [];
    if (!cmd.execute || typeof cmd.execute !== "function") {
      issues.push("missing execute()");
    }
    if (isSlash && !cmd.data) issues.push("missing data");
    if (!isSlash && !isPrefix)  issues.push("unknown type");

    if (issues.length > 0) {
      fail.push({ name, type, reason: issues.join(", ") });
    } else {
      if (!cmd.description && !cmd.data?.description) {
        warn.push({ name, type, note: "no description" });
      } else {
        pass.push({ name, type });
      }
    }
  }

  return { pass, fail, warn, total: pass.length + fail.length + warn.length };
}

function buildFieldValue(items, formatter) {
  const lines = items.map(formatter);
  const chunks = [];
  let current  = "";
  for (const line of lines) {
    if ((current + line + "\n").length > 1020) {
      chunks.push(current.trimEnd());
      current = "";
    }
    current += line + "\n";
  }
  if (current) chunks.push(current.trimEnd());
  return chunks;
}

module.exports = {
  name: "healthcheck",
  description: "Check the status of all loaded commands",
  slashOptions: [
    {
      name: "type",
      description: "Filter by command type",
      type: 3,
      required: false,
      choices: [
        { name: "All", value: "all" },
        { name: "Slash", value: "slash" },
        { name: "Prefix", value: "prefix" }
      ]
    }
  ],

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (options) => {
        if (interaction.deferred) return interaction.editReply(options);
        if (interaction.replied) return interaction.followUp(options);
        return interaction.reply(options);
      },
    };

    const args = [];
    if (interaction.options) {
      const type = interaction.options.getString("type");
      if (type) args.push(type);
    }

    const prefix = client.prefix;
    return this.execute(interactionWrapper, args, client, prefix);
  },

  async execute(message, args, client, prefix) {
    if (!message.member?.permissions?.has("Administrator")) {
      const display = new TextDisplayBuilder()
        .setContent("**" + client.emoji.cross + " You need Administrator permission to use this command.**");
      const container = new ContainerBuilder().addTextDisplayComponents(display);
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const filterType = args.length > 0 && ["all", "slash", "prefix"].includes(args[0].toLowerCase())
      ? args[0].toLowerCase() : "all";

    const { pass, fail, warn, total } = checkCommands(filterType);

    const statusLine = fail.length === 0
      ? "\u{1F7E2} All commands healthy"
      : "\u{1F534} " + fail.length + " command(s) need attention";

    const embed = new EmbedBuilder()
      .setTitle("\u{1FA79} Bot Health Check")
      .setDescription(
        "**Filter:** `" + filterType + "`  |  **Total scanned:** " + total + "\n" +
        "\u2705 Pass: **" + pass.length + "**  \u274C Fail: **" + fail.length + "**  \u26A0\uFE0F Warn: **" + warn.length + "**\n\n" +
        statusLine
      )
      .setColor(fail.length > 0 ? 0xff4444 : warn.length > 0 ? 0xffaa00 : 0x44ff88)
      .setTimestamp();

    if (pass.length > 0) {
      const chunks = buildFieldValue(pass, (c) => "\u2705 `" + c.name + "` [" + c.type + "]");
      chunks.forEach((chunk, i) => {
        embed.addFields({
          name: i === 0 ? "\u2705 Passing (" + pass.length + ")" : "\u2705 Passing (cont.)",
          value: chunk,
          inline: false,
        });
      });
    }

    if (warn.length > 0) {
      const chunks = buildFieldValue(warn, (c) => "\u26A0\uFE0F `" + c.name + "` [" + c.type + "] \u2014 " + c.note);
      chunks.forEach((chunk, i) => {
        embed.addFields({
          name: i === 0 ? "\u26A0\uFE0F Warnings (" + warn.length + ")" : "\u26A0\uFE0F Warnings (cont.)",
          value: chunk,
          inline: false,
        });
      });
    }

    if (fail.length > 0) {
      const chunks = buildFieldValue(fail, (c) => "\u274C `" + c.name + "` \u2014 " + c.reason);
      chunks.forEach((chunk, i) => {
        embed.addFields({
          name: i === 0 ? "\u274C Failed (" + fail.length + ")" : "\u274C Failed (cont.)",
          value: chunk,
          inline: false,
        });
      });
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("### \u{1FA79} Bot Health Check"),
        new TextDisplayBuilder().setContent(
          "**Filter:** `" + filterType + "`  |  **Total scanned:** " + total + "\n" +
          "\u2705 Pass: **" + pass.length + "**  \u274C Fail: **" + fail.length + "**  \u26A0\uFE0F Warn: **" + warn.length + "**"
        )
      );

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
