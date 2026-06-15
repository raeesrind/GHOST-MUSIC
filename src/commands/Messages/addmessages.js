const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const { messageCounts } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'addmessages',
  aliases: ['addmsg'],
  description: 'Manually add messages to a user\'s server count',
  category: 'Messages',
  usage: 'addmessages <user> <amount>',
  userPerms: ['Administrator'],
  botPerms: ['Administrator'],
  slashOptions: [
    { name: 'user', description: 'The user', type: 6, required: true },
    { name: 'amount', description: 'Number of messages to add (max 5000)', type: 4, required: true }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Administrator\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    if (amount < 1 || amount > 5000) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Amount must be between 1 and 5000.`))], flags: MessageFlags.IsComponentsV2 });
    }
    messageCounts.add(interaction.guild.id, user.id, amount);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Messages Added\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Added **${amount}** messages to **${user.displayName}**`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Administrator\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    if (args.length < 2) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.info} **Usage:** \`addmessages <user> <amount>\`\n${emoji.info} **Example:** \`addmessages @user 10\``))], flags: MessageFlags.IsComponentsV2 });
    }
    const id = args[0].replace(/[<@!>]/g, '');
    let user;
    try { user = await message.guild.members.fetch(id).then(m => m.user); } catch { return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} User not found.`))], flags: MessageFlags.IsComponentsV2 }); }
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount < 1 || amount > 5000) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Amount must be between 1 and 5000.`))], flags: MessageFlags.IsComponentsV2 });
    }
    messageCounts.add(message.guild.id, user.id, amount);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Messages Added\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Added **${amount}** messages to **${user.displayName}**`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
