const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags
} = require('discord.js');
const buildChecker = require('../../utils/checkNoPrefixAccess');

module.exports = {
  name: 'noprefixstatus',
  aliases: ['npstatus', 'nps'],
  description: 'Check no-prefix access status for this server',

  async execute(message, args, client) {
    const db = client.db;
    const config = require('../../config');
    const checker = buildChecker(db, config);

    const info = checker.getAccessInfo(message.guild.id);

    if (!info || !info.active) {
      const section = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${client.emoji.blank}${client.emoji.wickarrow} **Invite Method:** Use \`trackinvite\` to invite 3 members\n` +
            `${client.emoji.blank}${client.emoji.wickarrow} **Add Bot Method:** Use \`addbot <id1> <id2>\` to verify in 2 servers`
          )
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 })));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.cross} **No-Prefix Access:** Inactive`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
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
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 })));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.check} **No-Prefix Access:** Active`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(section);

    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
