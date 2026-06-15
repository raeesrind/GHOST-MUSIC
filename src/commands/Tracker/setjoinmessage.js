const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const { inviteConfig } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'setjoinmessage',
  description: 'Set a custom join message for the invite logger',
  category: 'Tracker',
  usage: 'setjoinmessage <message>',
  userPerms: ['ManageGuild'],
  slashOptions: [
    { name: 'message', description: 'The join message template', type: 3, required: true }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const msg = interaction.options.getString('message');
    inviteConfig.setJoinMessage(interaction.guild.id, msg);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Join Message Set\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Custom join message has been configured.`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    if (args.length === 0) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.info} **Usage:** \`setjoinmessage <message>\``))], flags: MessageFlags.IsComponentsV2 });
    }
    const msg = args.join(' ');
    inviteConfig.setJoinMessage(message.guild.id, msg);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Join Message Set\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Custom join message has been configured.`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
