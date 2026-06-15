const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const { messageCounts } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'clearmessages',
  aliases: ['clearmsg', 'resetmessages'],
  description: 'Reset a user\'s message count in this server',
  category: 'Messages',
  usage: 'clearmessages <user>',
  userPerms: ['Administrator'],
  botPerms: ['Administrator'],
  slashOptions: [
    { name: 'user', description: 'The user to clear messages for', type: 6, required: true }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Administrator\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const user = interaction.options.getUser('user');
    messageCounts.clear(interaction.guild.id, user.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Messages Cleared\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Cleared message count for **${user.displayName}**`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Administrator\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    if (args.length === 0) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.info} **Usage:** \`clearmessages <user>\`\n${emoji.info} **Example:** \`clearmessages @user\``))], flags: MessageFlags.IsComponentsV2 });
    }
    const id = args[0].replace(/[<@!>]/g, '');
    let user;
    try { user = await message.guild.members.fetch(id).then(m => m.user); } catch { return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} User not found.`))], flags: MessageFlags.IsComponentsV2 }); }
    messageCounts.clear(message.guild.id, user.id);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Messages Cleared\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Cleared message count for **${user.displayName}**`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
