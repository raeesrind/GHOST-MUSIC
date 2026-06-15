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

const cmdEnable = {
  name: 'enableleveling',
  aliases: ['levelingenable'],
  description: 'Enable leveling in this server (admin)',
  category: 'Leveling',
  userPerms: ['Administrator'],
  async execute(message) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    message.client.db.leveling.setConfig(message.guild.id, { leveling_enabled: 1 });
    message.client.db.leveling.setXpSettings(message.guild.id, { leveling_enabled: 1 });
    embedReply(message, message.client.emoji.check, 'Leveling Enabled', 'Leveling **enabled** — users can now earn XP and level up.');
  }
};

const cmdDisable = {
  name: 'disableleveling',
  aliases: ['levelingdisable'],
  description: 'Disable leveling in this server (admin)',
  category: 'Leveling',
  userPerms: ['Administrator'],
  async execute(message) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    message.client.db.leveling.setConfig(message.guild.id, { leveling_enabled: 0 });
    message.client.db.leveling.setXpSettings(message.guild.id, { leveling_enabled: 0 });
    embedReply(message, message.client.emoji.check, 'Leveling Disabled', 'Leveling **disabled** — users will no longer earn XP.');
  }
};

const cmdCooldown = {
  name: 'setxpcooldown',
  aliases: [],
  description: 'Set XP cooldown in seconds (admin, min 3)',
  category: 'Leveling',
  usage: '<seconds>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 3) return reply(message, `${message.client.emoji.cross} Cooldown must be **at least 3 seconds**.`);
    message.client.db.leveling.setConfig(message.guild.id, { xp_cooldown_seconds: seconds });
    embedReply(message, message.client.emoji.check, 'XP Cooldown Set', `XP cooldown set to **${seconds} seconds**.`);
  }
};

const cmdGlobalMult = {
  name: 'setglobalxpmultiplier',
  aliases: [],
  description: 'Set a global XP multiplier (admin)',
  category: 'Leveling',
  usage: '<multiplier>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const multiplier = parseFloat(args[0]);
    if (isNaN(multiplier) || multiplier <= 0) return reply(message, `${message.client.emoji.cross} Multiplier must be **greater than 0**.`);
    message.client.db.leveling.setMultiplier(message.guild.id, 'GLOBAL', 'global', multiplier);
    embedReply(message, message.client.emoji.check, 'Global XP Multiplier', `Global XP multiplier set to **${multiplier}x**.`);
  }
};

const cmdSetLevelMsg = {
  name: 'setlevelmsg',
  aliases: [],
  description: 'Set a custom level-up message (admin). Placeholders: {user} {username} {level} {guild}',
  category: 'Leveling',
  usage: '<message>',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    if (!args.length) {
      const prefix = message.client.prefix;
      return reply(message,
        `### Usage: ${prefix}setlevelmsg <message>\n\n` +
        `**Placeholders:**\n` +
        `\`{user}\` → Mention\n` +
        `\`{username}\` → Username\n` +
        `\`{level}\` → Level\n` +
        `\`{guild}\` → Server name\n\n` +
        `**Example:**\n` +
        `${prefix}setlevelmsg {user} reached Level {level}!`
      );
    }
    const msg = args.join(' ');
    message.client.db.leveling.setConfig(message.guild.id, { levelup_message: msg });
    embedReply(message, message.client.emoji.check, 'Level-Up Message Set', `**Custom Level-Up Message Set:**\n${msg}`);
  }
};

const cmdResetLevelMsg = {
  name: 'resetlevelmsg',
  aliases: [],
  description: 'Reset level-up message to default (admin)',
  category: 'Leveling',
  userPerms: ['Administrator'],
  async execute(message) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    message.client.db.leveling.setConfig(message.guild.id, { levelup_message: null });
    embedReply(message, message.client.emoji.check, 'Level-Up Message Reset', 'Level-up message has been reset to default.');
  }
};

module.exports = { all: [cmdEnable, cmdDisable, cmdCooldown, cmdGlobalMult, cmdSetLevelMsg, cmdResetLevelMsg] };
