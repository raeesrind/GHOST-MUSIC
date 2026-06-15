const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');
const { messageCounts } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'resetmymessages',
  aliases: ['resetmymsgs'],
  description: 'Reset your own message count in this server',
  category: 'Messages',
  usage: 'resetmymessages',

  async slashExecute(interaction, client) {
    messageCounts.resetMy(interaction.guild.id, interaction.user.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Messages Reset\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Your message count has been reset.`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    messageCounts.resetMy(message.guild.id, message.author.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Messages Reset\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Your message count has been reset.`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
