const { MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'testmessage',
  description: 'Preview a message template with your own data as an example',
  category: 'Tracker',
  usage: 'testmessage <message>',
  userPerms: ['ManageGuild'],
  slashOptions: [
    { name: 'message', description: 'The message template to preview', type: 3, required: true }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'You need `Manage Guild` permissions.', flags: MessageFlags.Ephemeral });
    }
    const template = interaction.options.getString('message');
    const resolved = resolveVariables(template, interaction.member, interaction.guild);
    await interaction.reply({ content: resolved, flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ content: 'You need `Manage Guild` permissions.' });
    }
    if (args.length === 0) return message.reply('Please provide a message template.');
    const template = args.join(' ');
    const resolved = resolveVariables(template, message.member, message.guild);
    await message.reply({ content: resolved, flags: MessageFlags.IsComponentsV2 });
  }
};

function resolveVariables(template, member, guild) {
  const vars = {
    '$member_count': guild.memberCount.toString(),
    '$ordinal_member_count': ordinal(guild.memberCount),
    '$inviter_name': member.user.username,
    '$inviter_mention': `<@${member.id}>`,
    '$member_name': member.user.username,
    '$member': member.user.tag,
    '$member_mention': `<@${member.id}>`,
    '$invites': '0',
    '$inviter_reg_invites': '0',
    '$fake_invites': '0',
    '$left_invites': '0',
    '$rejoins': '0',
    '$guild_name': guild.name,
    '$join_time': `<t:${Math.floor(Date.now() / 1000)}:R>`,
    '$member_created_at': `<t:${Math.floor(member.user.createdTimestamp / 1000)}:f>`,
    '$member_created_ago': `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
  };
  return template.replace(/\$\w+/g, match => vars[match] || match);
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
