const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags
} = require('discord.js');
const { GHOST_BOT_ID, NO_PREFIX_DAYS } = require('../../config');
const buildChecker = require('../../utils/checkNoPrefixAccess');

module.exports = {
  name: 'addbot',
  description: 'Verify Ghost-Music bot in 2 servers to get no-prefix access',

  async execute(message, args, client) {
    const db = client.db;
    const config = require('../../config');
    const checker = buildChecker(db, config);

    if (args.length < 2) {
      const header = new TextDisplayBuilder().setContent(`${client.emoji.info} **Add Bot Command**`);
      const usage = new TextDisplayBuilder().setContent(
        `${client.emoji.blank}${client.emoji.wickarrow} **Usage:** \`addbot <serverID1> <serverID2>\`\n` +
        `${client.emoji.blank}${client.emoji.wickarrow} **Example:** \`addbot 123456789 987654321\``
      );
      const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(usage);
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const [server1, server2] = args;

    if (server1 === server2) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Please provide **two different** server IDs.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const guild1 = client.guilds.cache.get(server1);
    const guild2 = client.guilds.cache.get(server2);

    if (!guild1) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} I am not in server with ID \`${server1}\`.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }
    if (!guild2) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} I am not in server with ID \`${server2}\`.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const botIn1 = guild1.members.cache.has(GHOST_BOT_ID);
    const botIn2 = guild2.members.cache.has(GHOST_BOT_ID);

    if (!botIn1) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Ghost-Music bot was NOT found in server \`${server1}\`.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }
    if (!botIn2) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Ghost-Music bot was NOT found in server \`${server2}\`.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    db.prepare(`
      INSERT INTO bot_verification (user_id, server1_id, server2_id, verified)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id) DO UPDATE SET
        server1_id = excluded.server1_id,
        server2_id = excluded.server2_id,
        verified   = 1
    `).run(message.author.id, server1, server2);

    checker.grantAccess(message.guild.id, message.author.id, 'addbot', NO_PREFIX_DAYS);

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${client.emoji.blank}${client.emoji.wickarrow} **Server 1:** \`${server1}\` ${client.emoji.check}\n` +
          `${client.emoji.blank}${client.emoji.wickarrow} **Server 2:** \`${server2}\` ${client.emoji.check}\n` +
          `${client.emoji.blank}${client.emoji.wickarrow} **Duration:** ${NO_PREFIX_DAYS} days`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 })));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.check} **Verification Successful!**`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(section)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Your server now has **No-Prefix Access for ${NO_PREFIX_DAYS} days!** Use any command without prefix.`));

    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
