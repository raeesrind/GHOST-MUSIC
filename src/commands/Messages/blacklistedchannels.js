const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');
const { messageBlacklist } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'blacklistedchannels',
  aliases: ['blchannels'],
  description: 'Lists all channels blacklisted from message counting',
  category: 'Messages',
  usage: 'blacklistedchannels',

  async slashExecute(interaction, client) {
    const channels = messageBlacklist.getAll(interaction.guild.id);
    const content = channels.length > 0
      ? channels.map(c => `${emoji.wickarrow} <#${c.channel_id}>`).join('\n')
      : `${emoji.warn} No channels are blacklisted.`;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Blacklisted Channels\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    const channels = messageBlacklist.getAll(message.guild.id);
    const content = channels.length > 0
      ? channels.map(c => `${emoji.wickarrow} <#${c.channel_id}>`).join('\n')
      : `${emoji.warn} No channels are blacklisted.`;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Blacklisted Channels\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
