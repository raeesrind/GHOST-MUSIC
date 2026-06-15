const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

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

function resolveChannel(message, arg) {
  if (!arg) return null;
  const id = arg.replace(/[<#>]/g, '');
  return message.guild.channels.cache.get(id) || null;
}

function resolveRole(message, arg) {
  if (!arg) return null;
  const id = arg.replace(/[<@&>]/g, '');
  return message.guild.roles.cache.get(id) || null;
}

const cmdChannelXpMult = {
  name: 'channelxpmultiplier',
  aliases: [],
  description: 'Set XP multiplier for a channel (admin)',
  category: 'Leveling',
  usage: '#channel <multiplier>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const channel = resolveChannel(message, args[0]);
    const multiplier = parseFloat(args[1]);
    if (!channel) return reply(message, `${message.client.emoji.cross} Usage: \`channelxpmultiplier #channel <multiplier>\``);
    if (isNaN(multiplier) || multiplier <= 0) return reply(message, `${message.client.emoji.cross} Multiplier must be **greater than 0**.`);
    message.client.db.leveling.setMultiplier(message.guild.id, channel.id, 'channel', multiplier);
    embedReply(message, message.client.emoji.check, 'Channel Multiplier Set', `XP multiplier **${multiplier}x** set for ${channel}.`);
  }
};

const cmdRemoveChannelXpMult = {
  name: 'removechannelxpmultiplier',
  aliases: [],
  description: 'Remove XP multiplier from a channel (admin)',
  category: 'Leveling',
  usage: '#channel',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const channel = resolveChannel(message, args[0]);
    if (!channel) return reply(message, `${message.client.emoji.cross} Usage: \`removechannelxpmultiplier #channel\``);
    message.client.db.leveling.removeMultiplier(message.guild.id, channel.id, 'channel');
    embedReply(message, message.client.emoji.check, 'Channel Multiplier Removed', `XP multiplier removed from ${channel}.`);
  }
};

const cmdRoleXpMult = {
  name: 'rolexpmultiplier',
  aliases: [],
  description: 'Set XP multiplier for a role (admin, 1-100)',
  category: 'Leveling',
  usage: '@role <multiplier>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const role = resolveRole(message, args[0]);
    const multiplier = parseFloat(args[1]);
    if (!role) return reply(message, `${message.client.emoji.cross} Usage: \`rolexpmultiplier @role <multiplier>\``);
    if (isNaN(multiplier) || multiplier <= 0 || multiplier > 100) return reply(message, `${message.client.emoji.cross} Multiplier must be between **0 and 100**.`);
    message.client.db.leveling.setMultiplier(message.guild.id, role.id, 'role', multiplier);
    embedReply(message, message.client.emoji.check, 'Role Multiplier Set', `XP multiplier **${multiplier}x** set for ${role}.`);
  }
};

const cmdRemoveRoleXpMult = {
  name: 'removerolexpmultiplier',
  aliases: [],
  description: 'Remove XP multiplier from a role (admin)',
  category: 'Leveling',
  usage: '@role',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const role = resolveRole(message, args[0]);
    if (!role) return reply(message, `${message.client.emoji.cross} Usage: \`removerolexpmultiplier @role\``);
    message.client.db.leveling.removeMultiplier(message.guild.id, role.id, 'role');
    embedReply(message, message.client.emoji.check, 'Role Multiplier Removed', `XP multiplier removed from ${role}.`);
  }
};

module.exports = { all: [cmdChannelXpMult, cmdRemoveChannelXpMult, cmdRoleXpMult, cmdRemoveRoleXpMult] };
