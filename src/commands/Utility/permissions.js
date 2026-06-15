const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'permissions',
  aliases: ['perms', 'botperms'],
  description: 'Displays information about what permissions the bot requires',
  category: 'Utility',
  usage: 'permissions',

  async slashExecute(interaction, client) {
    const required = [
      'View Channels', 'Send Messages', 'Embed Links', 'Attach Files',
      'Read Message History', 'Add Reactions', 'Use External Emojis',
      'Connect', 'Speak', 'Mute Members', 'Deafen Members',
      'Move Members', 'Ban Members', 'Kick Members',
      'Manage Messages', 'Manage Channels', 'Manage Roles',
      'Manage Nicknames', 'Manage Webhooks', 'Create Invite'
    ];
    const botMember = interaction.guild.members.me;
    const missing = required.filter(p => !botMember.permissions.has(PermissionFlagsBits[p.replace(/ /g, '')]));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Bot Permissions\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(missing.length === 0
        ? `${emoji.check} All required permissions are granted!`
        : `${emoji.warn} Missing permissions:\n${missing.map(p => `${emoji.cross} ${p}`).join('\n')}`
      ));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    const required = [
      'View Channels', 'Send Messages', 'Embed Links', 'Attach Files',
      'Read Message History', 'Add Reactions', 'Use External Emojis',
      'Connect', 'Speak', 'Mute Members', 'Deafen Members',
      'Move Members', 'Ban Members', 'Kick Members',
      'Manage Messages', 'Manage Channels', 'Manage Roles',
      'Manage Nicknames', 'Manage Webhooks', 'Create Invite'
    ];
    const botMember = message.guild.members.me;
    const missing = required.filter(p => !botMember.permissions.has(PermissionFlagsBits[p.replace(/ /g, '')]));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Bot Permissions\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(missing.length === 0
        ? `${emoji.check} All required permissions are granted!`
        : `${emoji.warn} Missing permissions:\n${missing.map(p => `${emoji.cross} ${p}`).join('\n')}`
      ));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
