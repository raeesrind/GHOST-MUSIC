const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');

const VARIABLES = [
  ['$member_count', 'Server member count'],
  ['$ordinal_member_count', 'Ordinal server member count'],
  ['$member_name', 'Member\'s name'],
  ['$member', 'Member\'s name and tag'],
  ['$member_mention', 'Mention the member'],
  ['$guild_name', 'Server name'],
  ['$join_time', 'Time when member joined']
];

module.exports = {
  name: 'greetvariables',
  description: 'List all available greet message variables',
  category: 'Greet',
  usage: 'greetvariables',

  async slashExecute(interaction, client) {
    const lines = VARIABLES.map(([v, desc]) => `\`${v}\` : ${desc}`).join('\n');
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Greet Variables\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Use these variables in your greet message templates`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    const lines = VARIABLES.map(([v, desc]) => `\`${v}\` : ${desc}`).join('\n');
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Greet Variables\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Use these variables in your greet message templates`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
