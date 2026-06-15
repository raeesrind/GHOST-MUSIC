const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const { SUPPORT_SERVER_ID, NO_PREFIX_DAYS } = require('../../config');
const buildChecker = require('../../utils/checkNoPrefixAccess');

module.exports = {
  name: 'setnpchannel',
  aliases: ['setnpc', 'npchannel'],
  category: 'Owner',
  description: 'Set up a no-prefix access panel with buttons in the current channel',
  owner: true,

  async slashExecute(interaction, client) {
    const wrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (opts) => {
        if (interaction.deferred) return interaction.editReply(opts);
        if (interaction.replied) return interaction.followUp(opts);
        return interaction.reply(opts);
      },
    };
    return this.execute(wrapper, [], client);
  },

  async execute(message, args, client) {
    const db = client.db.db || client.db;
    const config = require('../../config');
    const checker = buildChecker(db, config);

    const existing = db.prepare('SELECT * FROM noprefix_setup WHERE guildId = ?').get(message.guild.id);
    if (existing) {
      try {
        const oldChannel = client.channels.cache.get(existing.channelId);
        if (oldChannel) {
          const oldMsg = await oldChannel.messages.fetch(existing.messageId).catch(() => null);
          if (oldMsg) await oldMsg.delete().catch(() => {});
        }
      } catch (e) {}
      db.prepare('DELETE FROM noprefix_setup WHERE guildId = ?').run(message.guild.id);
    }

    const panel = buildPanel(client, message.guild.id, checker);

    const sent = await message.channel.send({ components: panel, flags: MessageFlags.IsComponentsV2 });

    db.prepare(`
      INSERT INTO noprefix_setup (guildId, channelId, messageId)
      VALUES (?, ?, ?)
    `).run(message.guild.id, message.channel.id, sent.id);

    const success = new TextDisplayBuilder().setContent(`${client.emoji.check} No-prefix access panel set up in ${message.channel}.`);
    return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(success)], flags: MessageFlags.IsComponentsV2 });
  },

  async componentsV2(interaction, client) {
    const db = client.db.db || client.db;
    const config = require('../../config');
    const checker = buildChecker(db, config);

    const customId = interaction.customId;

    if (customId === 'setnpchannel_invite') {
      const guild = client.guilds.cache.get(SUPPORT_SERVER_ID);
      if (!guild) {
        const d = new TextDisplayBuilder().setContent(`${client.emoji.cross} Support server not found.`);
        return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(d)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const existing = db.prepare('SELECT * FROM invite_tracking WHERE user_id = ?').get(interaction.user.id);
      if (existing) {
        const d = new TextDisplayBuilder().setContent(`${client.emoji.info} **Your Invite Link:** https://discord.gg/${existing.invite_code}\nProgress: ${existing.join_count}/3 members joined`);
        return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(d)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      try {
        const channel = guild.channels.cache
          .filter(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('CreateInstantInvite'))
          .first();
        if (!channel) {
          const d = new TextDisplayBuilder().setContent(`${client.emoji.cross} Cannot create invite. No valid channel found.`);
          return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(d)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const invite = await channel.createInvite({ maxAge: 0, maxUses: 0, unique: true, reason: `No-prefix invite for ${interaction.user.tag}` });

        db.prepare('INSERT INTO invite_tracking (user_id, invite_code, join_count, created_at) VALUES (?, ?, 0, ?)').run(interaction.user.id, invite.code, Date.now());

        const d = new TextDisplayBuilder().setContent(`${client.emoji.check} **Invite Created!**\nhttps://discord.gg/${invite.code}\n\nInvite **3 people** to unlock **${NO_PREFIX_DAYS} days** no-prefix access for your server!`);
        return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(d)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      } catch (err) {
        console.error('[npbutton_invite]', err);
        const d = new TextDisplayBuilder().setContent(`${client.emoji.cross} Failed to create invite. Check my permissions.`);
        return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(d)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }
    }

    if (customId === 'setnpchannel_addbot') {
      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${client.emoji.blank}${client.emoji.wickarrow} **Step 1:** Add Ghost-Music bot to **2 different servers**\n` +
            `${client.emoji.blank}${client.emoji.wickarrow} **Step 2:** Run \`addbot <serverID1> <serverID2>\`\n` +
            `${client.emoji.blank}${client.emoji.wickarrow} **Step 3:** Your server gets **${NO_PREFIX_DAYS} days** no-prefix access!`
          )
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ extension: 'png', size: 512 })));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.info} **Add Bot Method**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }

    if (customId === 'setnpchannel_status') {
      const info = checker.getAccessInfo(interaction.guildId);

      if (!info || !info.active) {
        const section = new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${client.emoji.blank}${client.emoji.wickarrow} **Invite:** \`trackinvite\` — invite 3 members\n` +
              `${client.emoji.blank}${client.emoji.wickarrow} **Add Bot:** \`addbot <id1> <id2>\` — verify in 2 servers`
            )
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ extension: 'png', size: 512 })));

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.cross} **No-Prefix Access:** Inactive`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addSectionComponents(section);

        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      let expiryText;
      if (!info.expires_at) {
        expiryText = '**Never** (Permanent)';
      } else {
        const remaining = info.expires_at - Date.now();
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        expiryText = `${days}d ${hours}h remaining`;
      }

      const methodMap = {
        owner:     `${client.emoji.owner} Granted by Owner`,
        developer: `${client.emoji.developer} Granted by Developer`,
        invite:    `${client.emoji.info} Invite Method`,
        addbot:    `${client.emoji.info} Add Bot Method`,
      };

      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${client.emoji.blank}${client.emoji.wickarrow} **Method:** ${methodMap[info.method] || info.method}\n` +
            `${client.emoji.blank}${client.emoji.wickarrow} **Expires:** ${expiryText}\n` +
            `${client.emoji.blank}${client.emoji.wickarrow} **Granted By:** <@${info.granted_by}>`
          )
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ extension: 'png', size: 512 })));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.check} **No-Prefix Access:** Active`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }

    if (customId === 'setnpchannel_refresh') {
      const record = db.prepare('SELECT * FROM noprefix_setup WHERE guildId = ?').get(interaction.guildId);
      if (!record) {
        const d = new TextDisplayBuilder().setContent(`${client.emoji.warn} No panel found for this server. Use \`setnpchannel\` to create one.`);
        return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(d)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const panel = buildPanel(client, interaction.guildId, checker);
      const sent = await interaction.channel.send({ components: panel, flags: MessageFlags.IsComponentsV2 });

      try { await interaction.message.delete().catch(() => {}); } catch (e) {}

      db.prepare('UPDATE noprefix_setup SET channelId = ?, messageId = ? WHERE guildId = ?').run(interaction.channel.id, sent.id, interaction.guildId);

      const d = new TextDisplayBuilder().setContent(`${client.emoji.check} Panel refreshed!`);
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(d)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }
  }
};

function buildPanel(client, guildId, checker) {
  const info = checker.getAccessInfo(guildId);
  const isActive = !!(info && info.active);

  const headerText = isActive
    ? `${client.emoji.check} **No-Prefix Access — Active**`
    : `${client.emoji.info} **No-Prefix Access Setup**`;

  const methodsSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${client.emoji.blank}${client.emoji.wickarrow} **📨 Invite Method**\n` +
        `${client.emoji.blank}Invite **3 members** to the support server using your tracked invite link.\n\n` +
        `${client.emoji.blank}${client.emoji.wickarrow} **🤖 Add Bot Method**\n` +
        `${client.emoji.blank}Add Ghost-Music bot to **2 different servers** and verify with \`addbot\`.\n\n` +
        `${client.emoji.blank}${client.emoji.wickarrow} **👑 Owner/Developer Grant**\n` +
        `${client.emoji.blank}Bot owners or developers can grant permanent access.`
      )
    )
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 })));

  const footerText = isActive
    ? `Your server has no-prefix access! Use any command without prefix.`
    : `Click a button below to get started or check your progress.`;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**What is No-Prefix Access?**\n` +
      `Type commands without any prefix — just send \`play\`, \`skip\`, \`help\` directly!`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addSectionComponents(methodsSection)
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footerText}`));

  const inviteBtn = new ButtonBuilder()
    .setCustomId('setnpchannel_invite')
    .setLabel('Get Invite')
    .setStyle(ButtonStyle.Success);

  const addbotBtn = new ButtonBuilder()
    .setCustomId('setnpchannel_addbot')
    .setLabel('Add Bot')
    .setStyle(ButtonStyle.Primary);

  const statusBtn = new ButtonBuilder()
    .setCustomId('setnpchannel_status')
    .setLabel('Status')
    .setStyle(ButtonStyle.Secondary);

  const refreshBtn = new ButtonBuilder()
    .setCustomId('setnpchannel_refresh')
    .setLabel('Refresh')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(inviteBtn, addbotBtn, statusBtn);
  const row2 = new ActionRowBuilder().addComponents(refreshBtn);

  return [container, row1, row2];
}
