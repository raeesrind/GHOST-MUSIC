const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");
const SmartAutoplayEngine = require("../../utils/SmartAutoplayEngine");

const MODES = ["OFF", "SIMILAR", "DISCOVER", "SMART"];
const MODE_LABELS = {
  OFF: "Disabled",
  SIMILAR: "Similar Only",
  DISCOVER: "Discover Mode",
  SMART: "Smart Autoplay"
};
const MODE_DESCRIPTIONS = {
  OFF: "No automatic track suggestions",
  SIMILAR: "Only tracks matching current genre/vibe",
  DISCOVER: "Occasional tracks outside your comfort zone",
  SMART: "Full weighted engine with mood & learning"
};

module.exports = {
  name: "autoplay",
  aliases: ["ap", "auto"],
  category: "Music",
  cooldown: 3,
  description: "Control smart autoplay mode",
  botPrams: ["EmbedLinks"],
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  slashOptions: [
    {
      name: "mode",
      description: "Select autoplay mode",
      type: 3,
      required: false,
      choices: [
        { name: "OFF — No autoplay", value: "OFF" },
        { name: "SIMILAR — Closely matching tracks only", value: "SIMILAR" },
        { name: "DISCOVER — Explore outside comfort zone", value: "DISCOVER" },
        { name: "SMART — Full smart autoplay (default)", value: "SMART" }
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
        if (interaction.deferred) {
          return await interaction.editReply(options);
        } else if (interaction.replied) {
          return await interaction.followUp(options);
        } else {
          return await interaction.reply(options);
        }
      },
    };

    const args = [];
    if (interaction.options) {
      const mode = interaction.options.getString("mode");
      if (mode) args.push(mode);
    }

    const prefix = client.prefix;
    return this.execute(interactionWrapper, args, client, prefix);
  },

  async execute(message, args, client, prefix) {
    const player = client.manager.players.get(message.guild.id);

    if (args.length > 0 && MODES.includes(args[0].toUpperCase())) {
      const newMode = args[0].toUpperCase();
      const wasOff = newMode === "OFF";
      player.data.set("autoplay", !wasOff);
      player.data.set("autoplayMode", newMode);
      if (!wasOff) {
        const engine = SmartAutoplayEngine.getEngine(client, player);
        engine._cachedCandidates = [];
        engine._cachedCurrentKey = null;
      }

      const display = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.check} Autoplay set to \`${MODE_LABELS[newMode]}\`**\n` +
          `-# ${MODE_DESCRIPTIONS[newMode]}`
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(display);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    return _showModeSelector(message, player, client);
  },
};

async function _showModeSelector(message, player, client) {
  const currentMode = player.data.get("autoplayMode") || "SMART";
  const isEnabled = player.data.get("autoplay") || false;
  const effectiveMode = isEnabled ? currentMode : "OFF";

  const headerDisplay = new TextDisplayBuilder()
    .setContent(`### ${client.emoji.music} Smart Autoplay Mode`);

  const currentDisplay = new TextDisplayBuilder()
    .setContent(
      `**Current Mode:** \`${MODE_LABELS[effectiveMode]}\`\n` +
      `-# ${MODE_DESCRIPTIONS[effectiveMode] || "No autoplay"}`
    );

  const separator = new SeparatorBuilder();

  const container = new ContainerBuilder()
    .addTextDisplayComponents(headerDisplay)
    .addSeparatorComponents(separator)
    .addTextDisplayComponents(currentDisplay);

  const row = new ActionRowBuilder();
  for (const mode of MODES) {
    const isActive = effectiveMode === mode;
    const btn = new ButtonBuilder()
      .setCustomId(`autoplay_${mode}`)
      .setLabel(MODE_LABELS[mode])
      .setStyle(isActive ? ButtonStyle.Primary : ButtonStyle.Secondary);

    if (mode === "OFF") btn.setEmoji(client.emoji.stop || "⏹");
    else if (mode === "SIMILAR") btn.setEmoji(client.emoji.shuffle || "🎵");
    else if (mode === "DISCOVER") btn.setEmoji(client.emoji.add || "🔀");
    else if (mode === "SMART") btn.setEmoji(client.emoji.staff || "🧠");

    row.addComponents(btn);
  }

  const reply = await message.reply({
    components: [container, row],
    flags: MessageFlags.IsComponentsV2
  });

  const collector = reply.createMessageComponentCollector({
    filter: (i) => {
      if (i.user.id !== message.author.id) {
        i.reply({
          components: [new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${client.emoji.cross} Only ${message.author.tag} can change autoplay mode.**`)
          )],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        }).catch(() => { });
        return false;
      }
      return true;
    },
    time: 30000
  });

  collector.on("collect", async (i) => {
    const mode = i.customId.replace("autoplay_", "");
    const wasOff = mode === "OFF";

    player.data.set("autoplay", !wasOff);
    player.data.set("autoplayMode", mode);

    if (!wasOff) {
      const engine = SmartAutoplayEngine.getEngine(client, player);
      engine._cachedCandidates = [];
      engine._cachedCurrentKey = null;
    }

    await i.deferUpdate();

    const newHeader = new TextDisplayBuilder()
      .setContent(`### ${client.emoji.music} Smart Autoplay Mode`);

    const newCurrent = new TextDisplayBuilder()
      .setContent(
        `**Current Mode:** \`${MODE_LABELS[mode]}\`\n` +
        `-# ${MODE_DESCRIPTIONS[mode]}`
      );

    const newContainer = new ContainerBuilder()
      .addTextDisplayComponents(newHeader)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(newCurrent);

    const newRow = new ActionRowBuilder();
    for (const m of MODES) {
      const isActive = mode === m;
      const btn = new ButtonBuilder()
        .setCustomId(`autoplay_${m}`)
        .setLabel(MODE_LABELS[m])
        .setStyle(isActive ? ButtonStyle.Primary : ButtonStyle.Secondary);

      if (m === "OFF") btn.setEmoji(client.emoji.stop || "⏹");
      else if (m === "SIMILAR") btn.setEmoji(client.emoji.shuffle || "🎵");
      else if (m === "DISCOVER") btn.setEmoji(client.emoji.add || "🔀");
      else if (m === "SMART") btn.setEmoji(client.emoji.staff || "🧠");

      newRow.addComponents(btn);
    }

    await i.editReply({
      components: [newContainer, newRow],
      flags: MessageFlags.IsComponentsV2
    });
  });

  collector.on("end", () => {
    const finalMode = player.data.get("autoplayMode") || "SMART";
    const finalEnabled = player.data.get("autoplay") || false;
    const finalEffective = finalEnabled ? finalMode : "OFF";

    const finalRow = new ActionRowBuilder();
    for (const m of MODES) {
      const isActive = finalEffective === m;
      finalRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`autoplay_${m}_disabled`)
          .setLabel(MODE_LABELS[m])
          .setStyle(isActive ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(true)
      );
    }

    reply.edit({
      components: [
        new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${client.emoji.music} Smart Autoplay Mode`),
            new TextDisplayBuilder().setContent(
              `**Current Mode:** \`${MODE_LABELS[finalEffective]}\`\n` +
              `-# Selection timed out`)
          ),
        finalRow
      ],
      flags: MessageFlags.IsComponentsV2
    }).catch(() => { });
  });
}
