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
  name: 'adddev',
  description: 'Owner only — add a bot developer',

  async execute(message, args, client) {
    const db = client.db;
    const config = require('../../config');
    const checker = buildChecker(db, config);

    if (!checker.isOwner(message.author.id)) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Only the bot owner can use this command.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const userId = args[0]?.replace(/[<@!>]/g, '');
    if (!userId) {
      const header = new TextDisplayBuilder().setContent(`${client.emoji.info} **Add Developer Command**`);
      const usage = new TextDisplayBuilder().setContent(
        `${client.emoji.blank}${client.emoji.wickarrow} **Usage:** \`adddev <@user or userID>\`\n` +
        `${client.emoji.blank}${client.emoji.wickarrow} **Example:** \`adddev @user\``
      );
      const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(usage);
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    db.prepare(`
      INSERT INTO developers (user_id, added_by, added_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO NOTHING
    `).run(userId, message.author.id, Date.now());

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${client.emoji.blank}${client.emoji.wickarrow} **Developer:** <@${userId}>`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 })));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.developer} **Developer Added!**`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(section);

    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
