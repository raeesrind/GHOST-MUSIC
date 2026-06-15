const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getXpForLevel, calculateLevel } = require('../../utils/xpMath');

// Ported from Python: self.cooldowns = {}  # {(guild_id, user_id): last_timestamp}
const cooldowns = new Map();

module.exports = {
  name: 'messageCreate',
  run: async (client, message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    try {
      const config = client.db.leveling.getConfig(guildId);
      const xpSettings = client.db.leveling.getXpSettings(guildId);
      const enabled = config ? config.leveling_enabled : (xpSettings ? xpSettings.leveling_enabled : 1);

      if (!enabled) return;

      // Check no-xp channels
      const noXpChannels = client.db.leveling.getNoXpChannels(guildId);
      if (noXpChannels.some(c => c.channel_id === message.channel.id)) return;

      // Cooldown check
      const cooldownKey = `${guildId}_${userId}`;
      const now = Math.floor(Date.now() / 1000);
      const cooldownSecs = config ? config.xp_cooldown_seconds : 60;
      const lastTs = cooldowns.get(cooldownKey);

      if (lastTs && (now - lastTs) < cooldownSecs) return;
      cooldowns.set(cooldownKey, now);

      // Calculate XP earned (base: deterministic, no randomness in original)
      let xpEarned = Math.floor(Math.random() * (15 - 5 + 1)) + 5;

      // Apply multipliers

      // Global multiplier (from xp_multipliers table — consistent with channel/role)
      const globalMult = client.db.leveling.getMultiplier(guildId, 'GLOBAL', 'global');
      if (globalMult) {
        xpEarned = Math.floor(xpEarned * globalMult.multiplier);
      } else if (config && config.global_multiplier && config.global_multiplier !== 1.0) {
        xpEarned = Math.floor(xpEarned * config.global_multiplier);
      }

      const channelMult = client.db.leveling.getMultiplier(guildId, message.channel.id, 'channel');
      if (channelMult) {
        xpEarned = Math.floor(xpEarned * channelMult.multiplier);
      }

      if (message.member) {
        const memberRoles = message.member.roles.cache;
        const roleMults = client.db.leveling.getMultipliers(guildId).filter(m => m.type === 'role');
        for (const rm of roleMults) {
          if (memberRoles.has(rm.target_id)) {
            xpEarned = Math.floor(xpEarned * rm.multiplier);
          }
        }
      }

      xpEarned = Math.max(1, xpEarned);

      // Update XP in DB
      client.db.leveling.updateXp(guildId, userId, xpEarned, now);

      // Check level-up
      const data = client.db.leveling.getXp(guildId, userId);
      if (!data) return;

      const totalXp = data.xp;
      const newLevel = calculateLevel(totalXp);

      if (newLevel === 0) return;

      const prevLevel = calculateLevel(totalXp - xpEarned);
      if (newLevel <= prevLevel) return;

      await handleLevelUp(client, message, newLevel, config);
    } catch (err) {
      console.error('[XP Handler Error]', err);
    }
  }
};

async function handleLevelUp(client, message, level, config) {
  const guildId = message.guild.id;
  const mode = config ? (config.rankup_mode || 'channel') : 'channel';
  const channelId = config ? config.rankup_channel : null;
  const customMsg = config ? config.levelup_message : null;

  // Build level-up message
  const defaultMsg = `${client.emoji.check} ${message.author} leveled up to **Level ${level}**!`;
  let msg = defaultMsg;
  if (customMsg) {
    msg = customMsg
      .replace(/{user}/g, message.author.toString())
      .replace(/{username}/g, message.author.username)
      .replace(/{level}/g, level)
      .replace(/{guild}/g, message.guild.name);
  }

  const display = new TextDisplayBuilder().setContent(msg);
  const container = new ContainerBuilder().addTextDisplayComponents(display);

  // Send notification based on mode
  if (mode === 'dm') {
    try {
      await message.author.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch { }
  } else if (mode === 'channel') {
    try {
      await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch { }
  } else if (mode === 'specific' && channelId) {
    const channel = message.guild.channels.cache.get(channelId);
    if (channel) {
      try {
        await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch { }
    } else {
      try {
        await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch { }
    }
  }

  // Assign level roles
  // Ported from Python: xp.py assign_level_roles
  await assignLevelRoles(message.member, message.guild, level, config);
}

async function assignLevelRoles(member, guild, level, config) {
  if (!member) return;
  const guildId = guild.id;
  const roleMode = config ? (config.role_mode || 'highest') : 'highest';

  const allRoles = guild.client.db.leveling.getLevelRoles(guildId);
  if (!allRoles.length) return;

  let matchedRoles = allRoles
    .filter(r => r.level <= level)
    .map(r => r.role_id);

  if (!matchedRoles.length) return;

  if (roleMode === 'highest') {
    const highest = allRoles
      .filter(r => r.level <= level)
      .sort((a, b) => b.level - a.level)[0];
    matchedRoles = highest ? [highest.role_id] : [];
  }

  for (const roleId of matchedRoles) {
    const role = guild.roles.cache.get(roleId);
    if (role && !member.roles.cache.has(roleId)) {
      try {
        await member.roles.add(role, 'Level-up reward');
      } catch { }
    }
  }
}
