const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');

const VARIABLES = [
  ['$member_count', 'Server member count'],
  ['$ordinal_member_count', 'Ordinal server member count'],
  ['$inviter_name', 'Inviter\'s name'],
  ['$inviter_mention', 'Mention the inviter'],
  ['$member_name', 'Member\'s name'],
  ['$member', 'Member\'s name and tag'],
  ['$member_mention', 'Mention the member'],
  ['$invites', 'Inviter\'s total invites'],
  ['$inviter_reg_invites', 'Inviter\'s regular invites'],
  ['$fake_invites', 'Inviter\'s fake invites'],
  ['$left_invites', 'Inviter\'s left invites'],
  ['$rejoins', 'Inviter\'s rejoins'],
  ['$guild_name', 'Server name'],
  ['$join_time', 'Time when member joined'],
  ['$member_created_at', 'Date and time when user joined Discord'],
  ['$member_created_ago', 'Relative time since member joined Discord'],
  ['$inviter_created_at', 'Date when inviter joined Discord'],
  ['$inviter_created_ago', 'Relative time since inviter joined Discord']
];

module.exports = {
  name: 'variables',
  description: 'List all available invite logger message variables',
  category: 'Tracker',
  usage: 'variables',

  async slashExecute(interaction, client) {
    const lines = VARIABLES.map(([v, desc]) => `\`${v}\` : ${desc}`).join('\n');
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Invite Logger Variables\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Use these variables in your custom join/leave messages`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    const lines = VARIABLES.map(([v, desc]) => `\`${v}\` : ${desc}`).join('\n');
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Invite Logger Variables\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Use these variables in your custom join/leave messages`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
