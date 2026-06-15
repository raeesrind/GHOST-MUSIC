const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');
const { greetConfigs } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'greetchannels',
  description: 'Display all configured greet channels for this server',
  category: 'Greet',
  usage: 'greetchannels',

  async slashExecute(interaction, client) {
    const configs = greetConfigs.get(interaction.guild.id);
    const content = configs.length > 0
      ? configs.map(c => `${emoji.wickarrow} <#${c.channel_id}> — ${c.style} style`).join('\n')
      : `${emoji.warn} No greet channels configured.`;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Greet Channels [${configs.length}]\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    const configs = greetConfigs.get(message.guild.id);
    const content = configs.length > 0
      ? configs.map(c => `${emoji.wickarrow} <#${c.channel_id}> — ${c.style} style`).join('\n')
      : `${emoji.warn} No greet channels configured.`;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Greet Channels [${configs.length}]\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
