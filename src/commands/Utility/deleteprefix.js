const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'deleteprefix',
  aliases: ['resetprefix'],
  description: 'Resets the server prefix to the default',
  category: 'Utility',
  usage: 'deleteprefix',
  userPerms: ['ManageGuild'],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    client.db.prefixes.delete(interaction.guild.id);
    const defaultPrefix = client.config?.prefix || '.';
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Prefix Reset\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Prefix reset to \`${defaultPrefix}\``));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    client.db.prefixes.delete(message.guild.id);
    const defaultPrefix = client.config?.prefix || '.';
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Prefix Reset\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Prefix reset to \`${defaultPrefix}\``));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
