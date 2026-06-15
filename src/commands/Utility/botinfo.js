const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, version } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'botinfo',
  aliases: ['bi'],
  description: 'Displays the information about the bot',
  category: 'Utility',
  usage: 'botinfo',

  async slashExecute(interaction, client) {
    const uptime = Math.floor(client.uptime / 1000);
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const channels = client.guilds.cache.reduce((a, g) => a + g.channels.cache.size, 0);
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} ${client.user.username} Information\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${emoji.wickarrow} **Developer:** <@${client.owners?.[0] || 'N/A'}>\n` +
        `${emoji.wickarrow} **Library:** discord.js v${version}\n` +
        `${emoji.wickarrow} **Servers:** ${guilds}\n` +
        `${emoji.wickarrow} **Users:** ${users.toLocaleString()}\n` +
        `${emoji.wickarrow} **Channels:** ${channels.toLocaleString()}\n` +
        `${emoji.wickarrow} **Uptime:** <t:${uptime}:R>\n` +
        `${emoji.wickarrow} **Memory:** ${memory} MB`
      ));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    const uptime = Math.floor(client.uptime / 1000);
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} ${client.user.username} Information\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${emoji.wickarrow} **Developer:** <@${client.owners?.[0] || 'N/A'}>\n` +
        `${emoji.wickarrow} **Library:** discord.js v${version}\n` +
        `${emoji.wickarrow} **Servers:** ${guilds}\n` +
        `${emoji.wickarrow} **Users:** ${users.toLocaleString()}\n` +
        `${emoji.wickarrow} **Uptime:** <t:${uptime}:R>\n` +
        `${emoji.wickarrow} **Memory:** ${memory} MB`
      ));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
