const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'premium',
  description: 'Shows information about Ghost Premium',
  category: 'Utility',
  usage: 'premium',

  async slashExecute(interaction, client) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.starFill} Premium Information\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${emoji.wickarrow} **Premium Features:**\n` +
        `${emoji.blank}${emoji.wickarrow} Higher quality music streaming\n` +
        `${emoji.blank}${emoji.wickarrow} 24/7 music playback\n` +
        `${emoji.blank}${emoji.wickarrow} Priority support\n` +
        `${emoji.blank}${emoji.wickarrow} Custom bot branding\n\n` +
        `${emoji.wickarrow} Contact <@${client.owners?.[0] || 'N/A'}> for premium information.`
      ));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.starFill} Premium Information\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${emoji.wickarrow} **Premium Features:**\n` +
        `${emoji.blank}${emoji.wickarrow} Higher quality music streaming\n` +
        `${emoji.blank}${emoji.wickarrow} 24/7 music playback\n` +
        `${emoji.blank}${emoji.wickarrow} Priority support\n` +
        `${emoji.blank}${emoji.wickarrow} Custom bot branding\n\n` +
        `${emoji.wickarrow} Contact <@${client.owners?.[0] || 'N/A'}> for premium information.`
      ));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
