const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const { greetConfigs } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'disablegreet',
  description: 'Remove a greet channel configuration',
  category: 'Greet',
  usage: 'disablegreet [channel]',
  userPerms: ['ManageGuild'],
  slashOptions: [
    { name: 'channel', description: 'The greet channel to remove', type: 7, required: false }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const config = greetConfigs.getByChannel(interaction.guild.id, channel.id);
    if (!config) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} <#${channel.id}> is not configured as a greet channel.`))], flags: MessageFlags.IsComponentsV2 });
    }
    greetConfigs.delete(interaction.guild.id, channel.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Greet Disabled\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Greet messages disabled for <#${channel.id}>`));
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
    const config = greetConfigs.getByChannel(message.guild.id, channel.id);
    if (!config) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} <#${channel.id}> is not configured as a greet channel.`))], flags: MessageFlags.IsComponentsV2 });
    }
    greetConfigs.delete(message.guild.id, channel.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Greet Disabled\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Greet messages disabled for <#${channel.id}>`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
