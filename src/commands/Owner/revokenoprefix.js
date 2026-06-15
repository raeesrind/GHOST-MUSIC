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
  name: 'revokenoprefix',
  aliases: ['rnp'],
  description: 'Owner/Dev only — revoke no-prefix access from a guild',

  async execute(message, args, client) {
    const db = client.db;
    const config = require('../../config');
    const checker = buildChecker(db, config);

    if (!checker.isOwner(message.author.id) && !checker.isDeveloper(message.author.id)) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} You do not have permission to use this command.`);
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const guildId = args[0] || message.guild.id;
    checker.revokeAccess(guildId);

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${client.emoji.blank}${client.emoji.wickarrow} **Guild:** \`${guildId}\``)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 512 })));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.check} **No-Prefix Access Revoked!**`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addSectionComponents(section);

    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
