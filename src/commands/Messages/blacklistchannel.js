const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const { messageBlacklist } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'blacklistchannel',
  aliases: ['blchannel'],
  description: 'Blacklist a channel from message counting',
  category: 'Messages',
  usage: 'blacklistchannel [channel]',
  userPerms: ['Administrator'],
  botPerms: ['Administrator'],
  slashOptions: [
    { name: 'channel', description: 'The channel to blacklist', type: 7, required: false }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Administrator\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    messageBlacklist.add(interaction.guild.id, channel.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Channel Blacklisted\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} <#${channel.id}> has been blacklisted from message counting.`));
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
    messageBlacklist.add(message.guild.id, channel.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Channel Blacklisted\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} <#${channel.id}> has been blacklisted from message counting.`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
