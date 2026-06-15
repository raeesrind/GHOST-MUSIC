const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags
} = require('discord.js');
const { SUPPORT_SERVER_ID, NO_PREFIX_DAYS } = require('../../config');

module.exports = {
  name: 'trackinvite',
  aliases: ['ti'],
  description: 'Get a tracked invite link to earn no-prefix access',

  async execute(message, args, client) {
    const db = client.db;

    const guild = client.guilds.cache.get(SUPPORT_SERVER_ID);
    if (!guild) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Support server not found.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const existing = db.prepare(
      'SELECT * FROM invite_tracking WHERE user_id = ?'
    ).get(message.author.id);

    if (existing) {
      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${client.emoji.blank}${client.emoji.wickarrow} **Link:** https://discord.gg/${existing.invite_code}\n` +
            `${client.emoji.blank}${client.emoji.wickarrow} **Progress:** ${existing.join_count}/3 members joined`
          )
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 })));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.info} **Your Invite Link**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Invite **3 people** to the support server to unlock **${NO_PREFIX_DAYS} days no-prefix access** for your server!`));

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    try {
      const channel = guild.channels.cache
        .filter(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('CreateInstantInvite'))
        .first();

      if (!channel) {
        const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Cannot create invite. No valid channel found.`);
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
      }

      const invite = await channel.createInvite({
        maxAge: 0,
        maxUses: 0,
        unique: true,
        reason: `No-prefix invite for ${message.author.tag}`,
      });

      db.prepare(`
        INSERT INTO invite_tracking (user_id, invite_code, join_count, created_at)
        VALUES (?, ?, 0, ?)
      `).run(message.author.id, invite.code, Date.now());

      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${client.emoji.blank}${client.emoji.wickarrow} **Link:** https://discord.gg/${invite.code}\n` +
            `${client.emoji.blank}${client.emoji.wickarrow} **Progress:** 0/3 members joined`
          )
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 })));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.check} **Invite Link Created!**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Once **3 people** join using your link, your server gets **${NO_PREFIX_DAYS} days no-prefix access!`));

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      console.error('[invite cmd]', err);
      const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Failed to create invite. Check my permissions in the support server.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
