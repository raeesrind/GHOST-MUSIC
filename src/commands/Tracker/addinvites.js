const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'addinvites',
  description: 'Add invites to a user',
  category: 'Tracker',
  usage: 'addinvites <user> <amount> <total|fake>',
  userPerms: ['ManageGuild'],
  slashOptions: [
    { name: 'user', description: 'The user', type: 6, required: true },
    { name: 'amount', description: 'Number of invites to add', type: 4, required: true },
    { name: 'type', description: 'Type of invites', type: 3, required: true, choices: [{ name: 'total', value: 'total' }, { name: 'fake', value: 'fake' }] }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const type = interaction.options.getString('type');

    if (amount < 1) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Amount must be at least 1.`))], flags: MessageFlags.IsComponentsV2 });
    }

    if (type === 'fake') {
      const current = client.db.invites.get(interaction.guild.id, user.id) || { fake: 0 };
      client.db.invites.set(interaction.guild.id, user.id, { fake: (current.fake || 0) + amount });
    } else {
      const current = client.db.invites.get(interaction.guild.id, user.id) || { invites: 0, bonus: 0 };
      client.db.invites.set(interaction.guild.id, user.id, { bonus: (current.bonus || 0) + amount });
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Invites Added\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Added **${amount}** ${type} invites to **${user.displayName}**`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    if (args.length < 3) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.info} **Usage:** \`addinvites <user> <amount> <total|fake>\``))], flags: MessageFlags.IsComponentsV2 });
    }
    const id = args[0].replace(/[<@!>]/g, '');
    let user;
    try { user = await message.guild.members.fetch(id).then(m => m.user); } catch { return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} User not found.`))], flags: MessageFlags.IsComponentsV2 }); }
    const amount = parseInt(args[1]);
    const type = args[2]?.toLowerCase();

    if (isNaN(amount) || amount < 1) return message.reply(`${emoji.warn} Amount must be at least 1.`);
    if (type !== 'total' && type !== 'fake') return message.reply(`${emoji.warn} Type must be \`total\` or \`fake\`.`);

    if (type === 'fake') {
      const current = client.db.invites.get(message.guild.id, user.id) || { fake: 0 };
      client.db.invites.set(message.guild.id, user.id, { fake: (current.fake || 0) + amount });
    } else {
      const current = client.db.invites.get(message.guild.id, user.id) || { invites: 0, bonus: 0 };
      client.db.invites.set(message.guild.id, user.id, { bonus: (current.bonus || 0) + amount });
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Invites Added\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Added **${amount}** ${type} invites to **${user.displayName}**`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
