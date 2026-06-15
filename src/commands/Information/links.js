const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "links",
  category: "Information",
  description: "Get invite links for all sub-bots",
  aliases: ["botlinks", "subbots"],
  cooldown: 5,
  slashOptions: [],
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
      const options = interaction.options.data;
      for (const option of options) {
        if (option.value !== undefined) {
          args.push(option.value.toString());
        }
      }
    }

    const prefix = client.prefix;
    return this.execute(interactionWrapper, args, client, prefix);
  },
  async execute(message, args, client, prefix) {
    const subBots = [
      { id: "1513558253680721920", label: "Ghost Music 1" },
      { id: "1513558412087263454", label: "Ghost Music 2" },
      { id: "1513558568299794593", label: "Ghost Music 3" },
    ];

    const linksRow = new ActionRowBuilder().addComponents(
      ...subBots.map((bot) =>
        new ButtonBuilder()
          .setLabel(bot.label)
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/api/oauth2/authorize?client_id=${bot.id}&permissions=8&scope=bot%20applications.commands`)
      )
    );

    const separator = new SeparatorBuilder();

    const linksDisplay = new TextDisplayBuilder()
      .setContent(`**${client.emoji.info} Invite Sub-Bots to your server.**`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(linksDisplay)
      .addSeparatorComponents(separator)
      .addActionRowComponents(linksRow);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
