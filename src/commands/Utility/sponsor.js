const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'sponsor',
  aliases: ['sponsors'],
  description: 'Displays the information about the sponsors of the bot',
  category: 'Utility',
  usage: 'sponsor',

  async slashExecute(interaction, client) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.starFill} Sponsors\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Want to sponsor Ghost Music?\n${emoji.wickarrow} Contact <@${client.owners?.[0] || 'N/A'}> for sponsorship opportunities.\n\n${emoji.wickarrow} Sponsors help keep the bot running with high-quality music streaming!`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.starFill} Sponsors\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Want to sponsor Ghost Music?\n${emoji.wickarrow} Contact <@${client.owners?.[0] || 'N/A'}> for sponsorship opportunities.\n\n${emoji.wickarrow} Sponsors help keep the bot running with high-quality music streaming!`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
