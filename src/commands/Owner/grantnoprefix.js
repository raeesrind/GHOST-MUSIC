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
  name: 'grantnoprefix',
  aliases: ['gnp'],
  description: 'Owner/Dev only — manually grant no-prefix access to a guild',

  async execute(message, args, client) {
    const db = client.db;
    const config = require('../../config');
    const checker = buildChecker(db, config);

    if (!checker.isOwner(message.author.id) && !checker.isDeveloper(message.author.id)) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} You do not have permission to use this command.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const guildId = args[0];
    const days = args[1] ? parseInt(args[1]) : null;

    if (!guildId) {
      const header = new TextDisplayBuilder().setContent(`${client.emoji.info} **Grant No-Prefix Command**`);
      const usage = new TextDisplayBuilder().setContent(
        `${client.emoji.blank}${client.emoji.wickarrow} **Usage:** \`grantnoprefix <guildId> [days]\`\n` +
        `${client.emoji.blank}${client.emoji.wickarrow} **Example:** \`grantnoprefix 123456789 30\`\n` +
        `${client.emoji.blank}${client.emoji.wickarrow} Leave days empty for **permanent** access.`
      );
      const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(usage);
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    checker.grantAccess(guildId, message.author.id, 'owner', days);

    const expiryText = days ? `${days} days` : 'Permanent';

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${client.emoji.blank}${client.emoji.wickarrow} **Guild:** \`${guildId}\`\n` +
          `${client.emoji.blank}${client.emoji.wickarrow} **Duration:** ${expiryText}`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 })));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.check} **No-Prefix Access Granted!**`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(section);

    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
