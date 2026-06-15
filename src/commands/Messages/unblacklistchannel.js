const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const { messageBlacklist } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'unblacklistchannel',
  aliases: ['unblchannel'],
  description: 'Remove a channel from the message counting blacklist',
  category: 'Messages',
  usage: 'unblacklistchannel [channel]',
  userPerms: ['Administrator'],
  botPerms: ['Administrator'],
  slashOptions: [
    { name: 'channel', description: 'The channel to unblacklist', type: 7, required: false }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Administrator\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    messageBlacklist.remove(interaction.guild.id, channel.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Channel Unblacklisted\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} <#${channel.id}> has been removed from the message counting blacklist.`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Administrator\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    let channel = message.channel;
    if (args.length > 0) {
      const id = args[0].replace(/[<#>]/g, '');
      channel = message.guild.channels.cache.get(id) || channel;
    }
    messageBlacklist.remove(message.guild.id, channel.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Channel Unblacklisted\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} <#${channel.id}> has been removed from the message counting blacklist.`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
