const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const { inviteConfig } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'unsetleavechannel',
  description: 'Unset the leave channel and disable member leave messages',
  category: 'Tracker',
  usage: 'unsetleavechannel',
  userPerms: ['ManageGuild'],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    inviteConfig.unsetLeaveChannel(interaction.guild.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Leave Channel Removed\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Leave channel has been removed from the database.`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    inviteConfig.unsetLeaveChannel(message.guild.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Leave Channel Removed\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Leave channel has been removed from the database.`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
