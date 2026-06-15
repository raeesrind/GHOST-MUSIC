const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const emoji = require('../../emojis');
const { inviteConfig } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'setleavechannel',
  description: 'Set the channel where member leave messages will be sent',
  category: 'Tracker',
  usage: 'setleavechannel [channel]',
  userPerms: ['ManageGuild'],
  slashOptions: [
    { name: 'channel', description: 'The leave channel', type: 7, required: false, channel_types: [ChannelType.GuildText] }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    inviteConfig.setLeaveChannel(interaction.guild.id, channel.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Leave Channel Set\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Leave messages will be sent to <#${channel.id}>`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    let channel = message.channel;
    if (args.length > 0) {
      const id = args[0].replace(/[<#>]/g, '');
      channel = message.guild.channels.cache.get(id) || channel;
    }
    inviteConfig.setLeaveChannel(message.guild.id, channel.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Leave Channel Set\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Leave messages will be sent to <#${channel.id}>`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
