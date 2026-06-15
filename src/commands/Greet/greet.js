const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const { greetConfigs } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'greet',
  description: 'Set the channel where greet messages will be sent',
  category: 'Greet',
  usage: 'greet [channel]',
  userPerms: ['ManageGuild'],
  slashOptions: [
    { name: 'channel', description: 'The channel for greet messages', type: 7, required: false }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    if (greetConfigs.count(interaction.guild.id) >= 3) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Maximum of 3 greet channels reached. Use \`disablegreet\` to remove one.`))], flags: MessageFlags.IsComponentsV2 });
    }
    greetConfigs.set(interaction.guild.id, channel.id, { message: 'Welcome {member} to {server}!' });
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Greet Channel Set\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Greet messages will be sent to <#${channel.id}>`));
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
    if (greetConfigs.count(message.guild.id) >= 3) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Maximum of 3 greet channels reached. Use \`disablegreet\` to remove one.`))], flags: MessageFlags.IsComponentsV2 });
    }
    greetConfigs.set(message.guild.id, channel.id, { message: 'Welcome {member} to {server}!' });
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Greet Channel Set\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Greet messages will be sent to <#${channel.id}>`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
