const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

function reply(message, content) {
  const display = new TextDisplayBuilder().setContent(content);
  const container = new ContainerBuilder().addTextDisplayComponents(display);
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { roles: [] } });
}

function embedReply(message, emojiIcon, title, body) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emojiIcon} ${title}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { roles: [] } });
}

function isAdmin(member) {
  return member.permissions.has('Administrator');
}

function resolveRole(message, arg) {
  if (!arg) return null;
  const id = arg.replace(/[<@&>]/g, '');
  return message.guild.roles.cache.get(id) || null;
}

const cmdAddLevelRole = {
  name: 'addlevelrole',
  aliases: [],
  description: 'Assign a role to be awarded at a specific level (admin)',
  category: 'Leveling',
  usage: '@role <level>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const role = resolveRole(message, args[0]);
    const level = parseInt(args[1]);
    if (!role) return reply(message, `${message.client.emoji.cross} Usage: \`addlevelrole @role <level>\``);
    if (isNaN(level) || level < 1) return reply(message, `${message.client.emoji.cross} Level must be at least **1**.`);
    message.client.db.leveling.setLevelRole(message.guild.id, level, role.id);
    embedReply(message, message.client.emoji.check, 'Level Role Added', `${role} will be awarded at **Level ${level}**.`);
  }
};

const cmdRemoveLevelRole = {
  name: 'removelevelrole',
  aliases: [],
  description: 'Remove a level role assignment (admin)',
  category: 'Leveling',
  usage: '<level>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const level = parseInt(args[0]);
    if (isNaN(level)) return reply(message, `${message.client.emoji.cross} Usage: \`removelevelrole <level>\``);
    message.client.db.leveling.removeLevelRole(message.guild.id, level);
    embedReply(message, message.client.emoji.check, 'Level Role Removed', `Level role for **Level ${level}** removed.`);
  }
};

const cmdListLevelRoles = {
  name: 'listlevelroles',
  aliases: ['llr', 'levelroles'],
  description: 'List all level role assignments',
  category: 'Leveling',
  async execute(message) {
    const rows = message.client.db.leveling.getLevelRoles(message.guild.id);
    if (!rows.length) return embedReply(message, message.client.emoji.cross, 'Level Roles', 'No level roles have been set yet.');

    const lines = rows.map(r => {
      const role = message.guild.roles.cache.get(r.role_id);
      const displayName = role ? `${role}` : `\`${r.role_id}\` *(deleted)*`;
      return `\`${r.level}\` | ${displayName}`;
    });

    embedReply(message, message.client.emoji.check, 'Level Roles', lines.join('\n'));
  }
};

const cmdSetRoleMode = {
  name: 'setrolemode',
  aliases: [],
  description: 'Set how level roles are assigned: highest or all (admin)',
  category: 'Leveling',
  usage: '<highest|all>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const mode = (args[0] || '').toLowerCase();
    if (mode !== 'highest' && mode !== 'all') return reply(message, `${message.client.emoji.cross} Mode must be \`highest\` or \`all\`.`);
    message.client.db.leveling.setXpSettings(message.guild.id, { role_mode: mode });
    const label = mode === 'highest' ? 'Highest level role only' : 'All unlocked roles (stacked)';
    embedReply(message, message.client.emoji.check, 'Role Mode Changed', `Mode set to **${label}**.`);
  }
};

const cmdSetRankupMode = {
  name: 'setrankupmode',
  aliases: [],
  description: 'Set where level-up notifications go: dm, channel, silent, specific (admin)',
  category: 'Leveling',
  usage: '<dm|channel|silent|specific> [#channel]',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const mode = (args[0] || '').toLowerCase();
    const valid = ['dm', 'channel', 'silent', 'specific'];
    if (!valid.includes(mode)) return reply(message, `${message.client.emoji.cross} Mode must be: \`dm\`, \`channel\`, \`silent\`, or \`specific\`.`);

    const channel = message.mentions.channels.first() || null;
    if (mode === 'specific' && !channel) return reply(message, `${message.client.emoji.cross} Please mention a channel for \`specific\` mode.`);

    const data = { rankup_mode: mode };
    if (channel) data.rankup_channel = channel.id;
    message.client.db.leveling.setConfig(message.guild.id, data);

    const desc = { dm: 'sent via DM.', channel: 'sent in the channel being typed in.', silent: 'disabled.', specific: `sent in ${channel}.` };
    embedReply(message, message.client.emoji.check, 'Rankup Mode Changed', `Level-up alerts will be **${desc[mode]}**`);
  }
};

module.exports = { all: [cmdAddLevelRole, cmdRemoveLevelRole, cmdListLevelRoles, cmdSetRoleMode, cmdSetRankupMode] };
