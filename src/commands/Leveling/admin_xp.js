const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getXpForLevel, calculateLevel } = require('../../utils/xpMath');

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

function resolveMember(message, arg) {
  if (!arg) return null;
  const id = arg.replace(/[<@!>]/g, '');
  return message.guild.members.cache.get(id) || null;
}

const cmdGivexp = {
  name: 'givexp',
  aliases: [],
  description: 'Give XP to a member (admin)',
  category: 'Leveling',
  usage: '@user <amount>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const member = resolveMember(message, args[0]);
    const amount = parseInt(args[1]);
    if (!member) return reply(message, `${message.client.emoji.cross} Usage: \`givexp @user <amount>\``);
    if (isNaN(amount) || amount <= 0) return reply(message, `${message.client.emoji.cross} Amount must be a positive number.`);
    message.client.db.leveling.setUserCustomXp(message.guild.id, member.id, amount);
    embedReply(message, message.client.emoji.check, 'XP Added', `Gave **${amount.toLocaleString()} XP** to ${member}.`);
  }
};

const cmdRemovexp = {
  name: 'removexp',
  aliases: [],
  description: 'Remove XP from a member (admin)',
  category: 'Leveling',
  usage: '@user <amount>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const member = resolveMember(message, args[0]);
    const amount = parseInt(args[1]);
    if (!member) return reply(message, `${message.client.emoji.cross} Usage: \`removexp @user <amount>\``);
    if (isNaN(amount) || amount <= 0) return reply(message, `${message.client.emoji.cross} Amount must be a positive number.`);
    message.client.db.leveling.removeUserCustomXp(message.guild.id, member.id, amount);
    embedReply(message, message.client.emoji.check, 'XP Removed', `Removed **${amount.toLocaleString()} XP** from ${member}.`);
  }
};

const cmdGivelvl = {
  name: 'givelvl',
  aliases: [],
  description: 'Add levels to a member (admin)',
  category: 'Leveling',
  usage: '@user <level>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const member = resolveMember(message, args[0]);
    const level = parseInt(args[1]);
    if (!member) return reply(message, `${message.client.emoji.cross} Usage: \`givelvl @user <level>\``);
    if (isNaN(level) || level < 1 || level > 600) return reply(message, `${message.client.emoji.cross} Level must be between 1 and 600.`);

    const data = message.client.db.leveling.getXp(message.guild.id, member.id);
    const currentXp = data ? data.xp : 0;
    const currentLevel = calculateLevel(currentXp);
    const newLevel = Math.min(currentLevel + level, 600);
    const extraXp = getXpForLevel(newLevel) - currentXp;
    if (extraXp > 0) message.client.db.leveling.setUserCustomXp(message.guild.id, member.id, extraXp);
    embedReply(message, message.client.emoji.check, 'Levels Added', `Added **${level}** levels to ${member} (level ${currentLevel} → ${newLevel}).`);
  }
};

const cmdRemlvl = {
  name: 'remlvl',
  aliases: [],
  description: 'Remove levels from a member or fully reset (admin)',
  category: 'Leveling',
  usage: '@user [levels]',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const member = resolveMember(message, args[0]);
    if (!member) return reply(message, `${message.client.emoji.cross} Usage: \`remlvl @user [levels]\``);

    const levels = args[1] ? parseInt(args[1]) : null;
    if (levels === null) {
      message.client.db.leveling.resetUser(message.guild.id, member.id);
      return embedReply(message, message.client.emoji.check, 'Levels Reset', `Fully reset XP for ${member}.`);
    }
    if (isNaN(levels) || levels < 1 || levels > 600) return reply(message, `${message.client.emoji.cross} Levels must be between 1 and 600.`);

    const data = message.client.db.leveling.getXp(message.guild.id, member.id);
    const currentXp = data ? data.xp : 0;
    const currentLevel = calculateLevel(currentXp);
    const newLevel = Math.max(0, currentLevel - levels);
    const xpToRemove = currentXp - getXpForLevel(newLevel);
    if (xpToRemove > 0) message.client.db.leveling.removeUserCustomXp(message.guild.id, member.id, xpToRemove);
    embedReply(message, message.client.emoji.check, 'Levels Removed', `Removed **${levels}** levels from ${member} (level ${currentLevel} → ${newLevel}).`);
  }
};

const cmdResetxp = {
  name: 'resetxp',
  aliases: [],
  description: 'Reset XP for a member or all members (admin)',
  category: 'Leveling',
  usage: '[@user] or "all"',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);

    if (args[0] && args[0].toLowerCase() === 'all') {
      message.client.db.leveling.resetAllUsers(message.guild.id);
      return embedReply(message, message.client.emoji.check, 'XP Reset', 'All members\' XP has been reset.');
    }

    const member = resolveMember(message, args[0]);
    if (!member) return reply(message, `${message.client.emoji.cross} Usage: \`resetxp @user\` or \`resetxp all\``);
    message.client.db.leveling.resetUser(message.guild.id, member.id);
    embedReply(message, message.client.emoji.check, 'XP Reset', `XP reset for ${member}.`);
  }
};

module.exports = { all: [cmdGivexp, cmdRemovexp, cmdGivelvl, cmdRemlvl, cmdResetxp] };
