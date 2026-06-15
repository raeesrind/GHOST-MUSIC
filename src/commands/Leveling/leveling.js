const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require('discord.js');
const emoji = require('../../emojis');
const { getXpForLevel, calculateLevel, formatXp } = require('../../utils/xpMath');

function quickReply(interaction, content, ephemeral = false) {
  const display = new TextDisplayBuilder().setContent(content);
  const container = new ContainerBuilder().addTextDisplayComponents(display);
  const flags = ephemeral ? MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 : MessageFlags.IsComponentsV2;
  const opts = { components: [container], flags, allowedMentions: { roles: [] } };
  if (interaction.deferred) {
    return interaction.editReply(opts);
  }
  if (interaction.replied) {
    return interaction.followUp(opts);
  }
  return interaction.reply(opts);
}

function embedReply(interaction, emojiIcon, title, body, ephemeral = false) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emojiIcon} ${title}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:t>`));
  const flags = ephemeral ? MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 : MessageFlags.IsComponentsV2;
  return interaction.reply({ components: [container], flags, allowedMentions: { roles: [] } });
}

function isAdmin(member) {
  return member.permissions.has('Administrator');
}

const subcommandOptions = [
  {
    name: 'rank',
    description: 'Show your or another member\'s rank card',
    type: 1,
    options: [
      { name: 'member', description: 'Member to check (leave blank for yourself)', type: 6, required: false }
    ]
  },
  {
    name: 'leaderboard',
    description: 'Show the server XP leaderboard',
    type: 1
  },
  {
    name: 'givexp',
    description: 'Give XP to a member (admin)',
    type: 1,
    options: [
      { name: 'member', description: 'Target member', type: 6, required: true },
      { name: 'amount', description: 'Amount of XP to give', type: 4, required: true }
    ]
  },
  {
    name: 'removexp',
    description: 'Remove XP from a member (admin)',
    type: 1,
    options: [
      { name: 'member', description: 'Target member', type: 6, required: true },
      { name: 'amount', description: 'Amount of XP to remove', type: 4, required: true }
    ]
  },
  {
    name: 'givelvl',
    description: 'Add levels to a member (admin)',
    type: 1,
    options: [
      { name: 'member', description: 'Target member', type: 6, required: true },
      { name: 'level', description: 'Number of levels to add', type: 4, required: true }
    ]
  },
  {
    name: 'remlvl',
    description: 'Remove levels from a member or fully reset (admin)',
    type: 1,
    options: [
      { name: 'member', description: 'Target member', type: 6, required: true },
      { name: 'levels', description: 'Levels to remove (omit to fully reset)', type: 4, required: false }
    ]
  },
  {
    name: 'resetxp',
    description: 'Reset XP for a member or all members (admin)',
    type: 1,
    options: [
      { name: 'member', description: 'Member to reset', type: 6, required: false },
      { name: 'all', description: 'Set to true to reset all members', type: 5, required: false }
    ]
  },
  {
    name: 'enable',
    description: 'Enable leveling in this server (admin)',
    type: 1
  },
  {
    name: 'disable',
    description: 'Disable leveling in this server (admin)',
    type: 1
  },
  {
    name: 'addlevelrole',
    description: 'Assign a role to be awarded at a specific level (admin)',
    type: 1,
    options: [
      { name: 'role', description: 'The role to award', type: 8, required: true },
      { name: 'level', description: 'The level required to earn this role', type: 4, required: true }
    ]
  },
  {
    name: 'removelevelrole',
    description: 'Remove a level role assignment (admin)',
    type: 1,
    options: [
      { name: 'level', description: 'The level whose role to remove', type: 4, required: true }
    ]
  },
  {
    name: 'listlevelroles',
    description: 'List all level role assignments',
    type: 1
  },
  {
    name: 'setrolemode',
    description: 'Set how level roles are assigned (admin)',
    type: 1,
    options: [
      {
        name: 'mode',
        description: 'Assignment mode',
        type: 3,
        required: true,
        choices: [
          { name: 'Highest level role only', value: 'highest' },
          { name: 'All unlocked roles (stack)', value: 'all' }
        ]
      }
    ]
  },
  {
    name: 'setrankupmode',
    description: 'Set where level-up notifications are sent (admin)',
    type: 1,
    options: [
      {
        name: 'mode',
        description: 'Notification mode',
        type: 3,
        required: true,
        choices: [
          { name: 'In DMs', value: 'dm' },
          { name: 'Channel being typed in', value: 'channel' },
          { name: 'No alerts (silent)', value: 'silent' },
          { name: 'Specific channel', value: 'specific' }
        ]
      },
      { name: 'channel', description: 'Required when mode is specific', type: 7, required: false }
    ]
  },
  {
    name: 'setxpcooldown',
    description: 'Set XP cooldown in seconds (admin, min 3)',
    type: 1,
    options: [
      { name: 'seconds', description: 'Cooldown in seconds (minimum 3, default 60)', type: 4, required: true }
    ]
  },
  {
    name: 'setglobalxpmultiplier',
    description: 'Set a global XP multiplier (admin)',
    type: 1,
    options: [
      { name: 'multiplier', description: 'Multiplier value (e.g. 2 = double XP)', type: 10, required: true }
    ]
  },
  {
    name: 'channelxpmultiplier',
    description: 'Manage XP multipliers for channels (admin)',
    type: 2,
    options: [
      {
        name: 'add',
        description: 'Set an XP multiplier for a channel',
        type: 1,
        options: [
          { name: 'channel', description: 'Target channel', type: 7, required: true },
          { name: 'multiplier', description: 'XP multiplier (e.g. 1.5)', type: 10, required: true }
        ]
      },
      {
        name: 'remove',
        description: 'Remove XP multiplier from a channel',
        type: 1,
        options: [
          { name: 'channel', description: 'Channel to remove from', type: 7, required: true }
        ]
      }
    ]
  },
  {
    name: 'rolexpmultiplier',
    description: 'Manage XP multipliers for roles (admin)',
    type: 2,
    options: [
      {
        name: 'add',
        description: 'Set an XP multiplier for a role',
        type: 1,
        options: [
          { name: 'role', description: 'Target role', type: 8, required: true },
          { name: 'multiplier', description: 'XP multiplier (1-100)', type: 10, required: true }
        ]
      },
      {
        name: 'remove',
        description: 'Remove XP multiplier from a role',
        type: 1,
        options: [
          { name: 'role', description: 'Role to remove from', type: 8, required: true }
        ]
      }
    ]
  },
  {
    name: 'noxpchannel',
    description: 'Manage channels where XP is blocked (admin)',
    type: 2,
    options: [
      {
        name: 'add',
        description: 'Block XP in a channel',
        type: 1,
        options: [
          { name: 'channel', description: 'Channel to block', type: 7, required: true }
        ]
      },
      {
        name: 'remove',
        description: 'Re-enable XP in a channel',
        type: 1,
        options: [
          { name: 'channel', description: 'Channel to unblock', type: 7, required: true }
        ]
      },
      {
        name: 'list',
        description: 'List all blocked channels',
        type: 1
      }
    ]
  },
  {
    name: 'setlevelmsg',
    description: 'Set a custom level-up message (admin)',
    type: 1,
    options: [
      {
        name: 'message',
        description: 'Message text. Placeholders: {user} {username} {level} {guild}',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'resetlevelmsg',
    description: 'Reset level-up message to default (admin)',
    type: 1
  }
];

module.exports = {
  name: 'leveling',
  category: 'Leveling',
  description: 'Leveling commands — rank, leaderboard, and admin tools',
  aliases: ['lvl', 'levels'],
  groupSlash: true,
  slashOptions: subcommandOptions,

  async slashExecute(interaction, client) {
    const subcommand = interaction.options.getSubcommand(true);
    const subcommandGroup = interaction.options.getSubcommandGroup(false);

    if (subcommandGroup) {
      switch (subcommandGroup) {
        case 'channelxpmultiplier': return handleChannelXpMult(client, interaction, subcommand);
        case 'rolexpmultiplier': return handleRoleXpMult(client, interaction, subcommand);
        case 'noxpchannel': return handleNoXpChannel(client, interaction, subcommand);
      }
    }

    switch (subcommand) {
      case 'rank': return handleRank(client, interaction);
      case 'leaderboard': return handleLeaderboard(client, interaction);
      case 'givexp': return handleGiveXp(client, interaction);
      case 'removexp': return handleRemoveXp(client, interaction);
      case 'givelvl': return handleGiveLvl(client, interaction);
      case 'remlvl': return handleRemLvl(client, interaction);
      case 'resetxp': return handleResetXp(client, interaction);
      case 'enable': return handleEnable(client, interaction);
      case 'disable': return handleDisable(client, interaction);
      case 'addlevelrole': return handleAddLevelRole(client, interaction);
      case 'removelevelrole': return handleRemoveLevelRole(client, interaction);
      case 'listlevelroles': return handleListLevelRoles(client, interaction);
      case 'setrolemode': return handleSetRoleMode(client, interaction);
      case 'setrankupmode': return handleSetRankupMode(client, interaction);
      case 'setxpcooldown': return handleSetXpCooldown(client, interaction);
      case 'setglobalxpmultiplier': return handleSetGlobalXpMultiplier(client, interaction);
      case 'setlevelmsg': return handleSetLevelMsg(client, interaction);
      case 'resetlevelmsg': return handleResetLevelMsg(client, interaction);
      default:
        return quickReply(interaction, `${client.emoji.cross} Unknown subcommand: \`${subcommand}\``, true);
    }
  }
};

// ── Rank ──────────────────────────────────────────────────────────────────────

async function handleRank(client, interaction) {
  const target = interaction.options.getMember('member') || interaction.member;
  await interaction.deferReply();

  const data = client.db.leveling.getXp(interaction.guild.id, target.id);
  if (!data || data.xp === 0) {
    return quickReply(interaction, `${client.emoji.cross} ${target} has no XP yet.`);
  }

  try {
    const { generateRankCard } = require('./rank.js');
    const { AttachmentBuilder } = require('discord.js');
    const buf = await generateRankCard(interaction.guild.id, target, client);
    const attachment = new AttachmentBuilder(buf, { name: 'rank.jpg' });
    console.time('EDIT_REPLY');
    await interaction.editReply({ files: [attachment] });
    console.timeEnd('EDIT_REPLY');
  } catch (err) {
    console.error('[Rank Error]', err);
    await interaction.editReply({
      components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.cross} An error occurred generating rank card: \`${err.message}\``))],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

async function handleLeaderboard(client, interaction) {
  await interaction.deferReply();

  const rows = client.db.leveling.getAllUserXp(interaction.guild.id);
  if (!rows.length) {
    return quickReply(interaction, `${client.emoji.cross} No XP data available yet.`);
  }

  const pages = [];
  for (let i = 0; i < rows.length; i += 10) {
    pages.push(rows.slice(i, i + 10));
  }
  const totalPages = pages.length;

  const rankEmoji = ['🥇', '🥈', '🥉'];

  function buildPage(pageNum) {
    const page = pages[pageNum];
    const lines = page.map((row, index) => {
      const userLevel = calculateLevel(row.xp);
      const globalRank = pageNum * 10 + index + 1;
      const rankStr = globalRank <= 3 ? rankEmoji[globalRank - 1] : `\`${globalRank}\``;
      return `${rankStr} \u200B<@${row.user_id}> — Level ${userLevel} (${formatXp(row.xp)} XP)`;
    });

    return new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${client.emoji.check} Leaderboard for ${interaction.guild.name}\n` +
        `-# Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:t>`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Page ${pageNum + 1} / ${totalPages}`));
  }

  let currentPage = 0;
  let content = buildPage(0);

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

  const row = new ActionRowBuilder();
  const prevBtn = new ButtonBuilder().setCustomId('lb_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(true);
  const stopBtn = new ButtonBuilder().setCustomId('lb_stop').setLabel('⏹').setStyle(ButtonStyle.Secondary);
  const nextBtn = new ButtonBuilder().setCustomId('lb_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(totalPages <= 1);
  row.addComponents(prevBtn, stopBtn, nextBtn);

  const msg = await interaction.editReply({ components: [content, row], flags: MessageFlags.IsComponentsV2 });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 60000,
    componentType: ComponentType.Button
  });

  collector.on('collect', async (i) => {
    if (i.customId === 'lb_prev') {
      currentPage = Math.max(0, currentPage - 1);
    } else if (i.customId === 'lb_next') {
      currentPage = Math.min(totalPages - 1, currentPage + 1);
    } else if (i.customId === 'lb_stop') {
      prevBtn.setDisabled(true);
      nextBtn.setDisabled(true);
      stopBtn.setDisabled(true);
      await i.update({ components: [buildPage(currentPage), row], flags: MessageFlags.IsComponentsV2 });
      collector.stop();
      return;
    }

    prevBtn.setDisabled(currentPage === 0);
    nextBtn.setDisabled(currentPage >= totalPages - 1);
    await i.update({ components: [buildPage(currentPage), row], flags: MessageFlags.IsComponentsV2 });
  });

  collector.on('end', () => {
    prevBtn.setDisabled(true);
    nextBtn.setDisabled(true);
    stopBtn.setDisabled(true);
    msg.edit({ components: [buildPage(currentPage), row], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
  });
}

// ── givexp ────────────────────────────────────────────────────────────────────

async function handleGiveXp(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const member = interaction.options.getMember('member');
  const amount = interaction.options.getInteger('amount');
  if (amount <= 0) return quickReply(interaction, `${client.emoji.cross} Amount must be greater than 0.`, true);

  client.db.leveling.setUserCustomXp(interaction.guild.id, member.id, amount);
  embedReply(interaction, client.emoji.check, 'XP Added', `Gave **${amount.toLocaleString()} XP** to ${member}.`);
}

// ── removexp ──────────────────────────────────────────────────────────────────

async function handleRemoveXp(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const member = interaction.options.getMember('member');
  const amount = interaction.options.getInteger('amount');
  if (amount <= 0) return quickReply(interaction, `${client.emoji.cross} Amount must be greater than 0.`, true);

  client.db.leveling.removeUserCustomXp(interaction.guild.id, member.id, amount);
  embedReply(interaction, client.emoji.check, 'XP Removed', `Removed **${amount.toLocaleString()} XP** from ${member}.`);
}

// ── givelvl ───────────────────────────────────────────────────────────────────

async function handleGiveLvl(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const member = interaction.options.getMember('member');
  const level = interaction.options.getInteger('level');
  if (level < 1 || level > 600) return quickReply(interaction, `${client.emoji.cross} Level must be between 1 and 600.`, true);

  const data = client.db.leveling.getXp(interaction.guild.id, member.id);
  const currentXp = data ? data.xp : 0;
  const currentLevel = calculateLevel(currentXp);
  const newLevel = Math.min(currentLevel + level, 600);
  const targetXp = getXpForLevel(newLevel);
  const extraXp = targetXp - currentXp;

  if (extraXp > 0) {
    client.db.leveling.setUserCustomXp(interaction.guild.id, member.id, extraXp);
  }

  embedReply(interaction, client.emoji.check, 'Levels Added', `Added **${level}** levels to ${member} (level ${currentLevel} → ${newLevel}).`);
}

// ── remlvl ────────────────────────────────────────────────────────────────────

async function handleRemLvl(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const member = interaction.options.getMember('member');
  const levels = interaction.options.getInteger('levels');

  if (levels === null) {
    client.db.leveling.resetUser(interaction.guild.id, member.id);
    return embedReply(interaction, client.emoji.check, 'Levels Reset', `Fully reset XP for ${member}.`);
  }

  if (levels < 1 || levels > 600) return quickReply(interaction, `${client.emoji.cross} Levels must be between 1 and 600.`, true);

  const data = client.db.leveling.getXp(interaction.guild.id, member.id);
  const currentXp = data ? data.xp : 0;
  const currentLevel = calculateLevel(currentXp);
  const newLevel = Math.max(0, currentLevel - levels);
  const xpToRemove = currentXp - getXpForLevel(newLevel);

  if (xpToRemove > 0) {
    client.db.leveling.removeUserCustomXp(interaction.guild.id, member.id, xpToRemove);
  }

  embedReply(interaction, client.emoji.check, 'Levels Removed', `Removed **${levels}** levels from ${member} (level ${currentLevel} → ${newLevel}).`);
}

// ── resetxp ───────────────────────────────────────────────────────────────────

async function handleResetXp(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);

  const member = interaction.options.getMember('member');
  const all = interaction.options.getBoolean('all');

  if (all) {
    client.db.leveling.resetAllUsers(interaction.guild.id);
    return embedReply(interaction, client.emoji.check, 'XP Reset', 'All members\' XP has been reset.');
  }

  if (!member) return quickReply(interaction, `${client.emoji.cross} Please specify a member or set \`all\` to true.`, true);

  client.db.leveling.resetUser(interaction.guild.id, member.id);
  embedReply(interaction, client.emoji.check, 'XP Reset', `XP reset for ${member}.`);
}

// ── enable / disable ──────────────────────────────────────────────────────────

async function handleEnable(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  client.db.leveling.setConfig(interaction.guild.id, { leveling_enabled: 1 });
  client.db.leveling.setXpSettings(interaction.guild.id, { leveling_enabled: 1 });
  embedReply(interaction, client.emoji.check, 'Leveling Enabled', 'Leveling **enabled** — users can now earn XP and level up.');
}

async function handleDisable(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  client.db.leveling.setConfig(interaction.guild.id, { leveling_enabled: 0 });
  client.db.leveling.setXpSettings(interaction.guild.id, { leveling_enabled: 0 });
  embedReply(interaction, client.emoji.check, 'Leveling Disabled', 'Leveling **disabled** — users will no longer earn XP.');
}

// ── addlevelrole ──────────────────────────────────────────────────────────────

async function handleAddLevelRole(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const role = interaction.options.getRole('role');
  const level = interaction.options.getInteger('level');
  if (level < 1) return quickReply(interaction, `${client.emoji.cross} Level must be at least **1**.`, true);

  client.db.leveling.setLevelRole(interaction.guild.id, level, role.id);
  embedReply(interaction, client.emoji.check, 'Level Role Added', `${role} will be awarded at **Level ${level}**.`);
}

// ── removelevelrole ───────────────────────────────────────────────────────────

async function handleRemoveLevelRole(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const level = interaction.options.getInteger('level');
  client.db.leveling.removeLevelRole(interaction.guild.id, level);
  embedReply(interaction, client.emoji.check, 'Level Role Removed', `Level role for **Level ${level}** removed.`);
}

// ── listlevelroles ────────────────────────────────────────────────────────────

async function handleListLevelRoles(client, interaction) {
  const rows = client.db.leveling.getLevelRoles(interaction.guild.id);
  if (!rows.length) return embedReply(interaction, client.emoji.cross, 'Level Roles', 'No level roles have been set yet.');

  const lines = rows.map(r => {
    const role = interaction.guild.roles.cache.get(r.role_id);
    const displayName = role ? `${role}` : `\`${r.role_id}\` *(deleted)*`;
    return `\`${r.level}\` | ${displayName}`;
  });

  embedReply(interaction, client.emoji.check, 'Level Roles', lines.join('\n'));
}

// ── setrolemode ───────────────────────────────────────────────────────────────

async function handleSetRoleMode(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const mode = interaction.options.getString('mode');

  client.db.leveling.setXpSettings(interaction.guild.id, { role_mode: mode });
  const label = mode === 'highest' ? 'Highest level role only' : 'All unlocked roles (stacked)';
  embedReply(interaction, client.emoji.check, 'Role Mode Changed', `Mode set to **${label}**.`);
}

// ── setrankupmode ─────────────────────────────────────────────────────────────

async function handleSetRankupMode(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const mode = interaction.options.getString('mode');
  const channel = interaction.options.getChannel('channel');

  if (mode === 'specific' && !channel) return quickReply(interaction, `${client.emoji.cross} Please provide a **channel** when using \`specific\` mode.`, true);

  const data = { rankup_mode: mode };
  if (channel) data.rankup_channel = channel.id;

  client.db.leveling.setConfig(interaction.guild.id, data);

  const descriptions = {
    dm: 'Level-up alerts will be sent via **DM**.',
    channel: 'Level-up alerts will be sent in the **channel being typed in**.',
    silent: 'Level-up alerts are **disabled**.',
    specific: `Level-up alerts will be sent in ${channel}.`
  };
  embedReply(interaction, client.emoji.check, 'Rankup Mode Changed', descriptions[mode]);
}

// ── setxpcooldown ─────────────────────────────────────────────────────────────

async function handleSetXpCooldown(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const seconds = interaction.options.getInteger('seconds');
  if (seconds < 3) return quickReply(interaction, `${client.emoji.cross} Cooldown must be **at least 3 seconds**.`, true);

  client.db.leveling.setConfig(interaction.guild.id, { xp_cooldown_seconds: seconds });
  embedReply(interaction, client.emoji.check, 'XP Cooldown Set', `XP cooldown set to **${seconds} seconds**.`);
}

// ── setglobalxpmultiplier ─────────────────────────────────────────────────────

async function handleSetGlobalXpMultiplier(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const multiplier = interaction.options.getNumber('multiplier');
  if (multiplier <= 0) return quickReply(interaction, `${client.emoji.cross} Multiplier must be **greater than 0**.`, true);

  client.db.leveling.setMultiplier(interaction.guild.id, 'GLOBAL', 'global', multiplier);
  embedReply(interaction, client.emoji.check, 'Global XP Multiplier', `Global XP multiplier set to **${multiplier}x**.`);
}

// ── channelxpmultiplier ───────────────────────────────────────────────────────

async function handleChannelXpMult(client, interaction, subcommand) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const channel = interaction.options.getChannel('channel');

  if (subcommand === 'add') {
    const multiplier = interaction.options.getNumber('multiplier');
    if (multiplier <= 0) return quickReply(interaction, `${client.emoji.cross} Multiplier must be **greater than 0**.`, true);
    client.db.leveling.setMultiplier(interaction.guild.id, channel.id, 'channel', multiplier);
    embedReply(interaction, client.emoji.check, 'Channel Multiplier Set', `XP multiplier **${multiplier}x** set for ${channel}.`);
  } else if (subcommand === 'remove') {
    client.db.leveling.removeMultiplier(interaction.guild.id, channel.id, 'channel');
    embedReply(interaction, client.emoji.check, 'Channel Multiplier Removed', `XP multiplier removed from ${channel}.`);
  }
}

// ── rolexpmultiplier ──────────────────────────────────────────────────────────

async function handleRoleXpMult(client, interaction, subcommand) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const role = interaction.options.getRole('role');

  if (subcommand === 'add') {
    const multiplier = interaction.options.getNumber('multiplier');
    if (multiplier <= 0 || multiplier > 100) return quickReply(interaction, `${client.emoji.cross} Multiplier must be between **0 and 100**.`, true);
    client.db.leveling.setMultiplier(interaction.guild.id, role.id, 'role', multiplier);
    embedReply(interaction, client.emoji.check, 'Role Multiplier Set', `XP multiplier **${multiplier}x** set for ${role}.`);
  } else if (subcommand === 'remove') {
    client.db.leveling.removeMultiplier(interaction.guild.id, role.id, 'role');
    embedReply(interaction, client.emoji.check, 'Role Multiplier Removed', `XP multiplier removed from ${role}.`);
  }
}

// ── noxpchannel ───────────────────────────────────────────────────────────────

async function handleNoXpChannel(client, interaction, subcommand) {
  if (subcommand === 'list') {
    const rows = client.db.leveling.getNoXpChannels(interaction.guild.id);
    if (!rows.length) return quickReply(interaction, `${client.emoji.cross} No channels are currently blocking XP.`);

    const lines = rows.map(r => `${r.channel_id}`);
    const channels = rows.map(r => interaction.guild.channels.cache.get(r.channel_id));
    const body = channels.length
      ? channels.map(c => c.toString()).join('\n')
      : lines.join('\n');
    return embedReply(interaction, client.emoji.check, 'No-XP Channels', body, true);
  }

  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const channel = interaction.options.getChannel('channel');

  if (subcommand === 'add') {
    client.db.leveling.addNoXpChannel(interaction.guild.id, channel.id);
    embedReply(interaction, client.emoji.check, 'No-XP Channel Added', `Users will **not** earn XP in ${channel}.`);
  } else if (subcommand === 'remove') {
    client.db.leveling.removeNoXpChannel(interaction.guild.id, channel.id);
    embedReply(interaction, client.emoji.check, 'No-XP Channel Removed', `XP earning **re-enabled** in ${channel}.`);
  }
}

// ── setlevelmsg / resetlevelmsg ───────────────────────────────────────────────

async function handleSetLevelMsg(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  const message = interaction.options.getString('message');
  client.db.leveling.setConfig(interaction.guild.id, { levelup_message: message });
  embedReply(interaction, client.emoji.check, 'Level-Up Message Set', `**Custom Level-Up Message Set:**\n${message}`);
}

async function handleResetLevelMsg(client, interaction) {
  if (!isAdmin(interaction.member)) return quickReply(interaction, `${client.emoji.cross} You need Administrator permission.`, true);
  client.db.leveling.setConfig(interaction.guild.id, { levelup_message: null });
  embedReply(interaction, client.emoji.check, 'Level-Up Message Reset', 'Level-up message has been reset to default.');
}
