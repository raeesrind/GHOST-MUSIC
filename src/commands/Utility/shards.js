const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'shards',
  aliases: ['shardinfo'],
  description: 'Displays the information about the shards',
  category: 'Utility',
  usage: 'shards',

  async slashExecute(interaction, client) {
    let shardInfo = `${emoji.wickarrow} **Current Shard:** ${client.shard?.ids?.[0] ?? 0}\n${emoji.wickarrow} **Total Shards:** ${client.shard?.count ?? 1}`;

    try {
      if (client.shard) {
        const guildCounts = await client.shard.fetchClientValues('guilds.cache.size');
        const totalGuilds = guildCounts.reduce((a, c) => a + c, 0);
        shardInfo += `\n${emoji.wickarrow} **Total Guilds:** ${totalGuilds}`;

        const shardStatus = await client.shard.broadcastEval(c => ({
          id: c.shard?.ids?.[0] ?? 0,
          guilds: c.guilds.cache.size,
          ping: c.ws.ping
        }));
        shardInfo += `\n\n${shardStatus.map(s => `Shard ${s.id}: ${s.guilds} guilds, ${s.ping}ms`).join('\n')}`;
      }
    } catch {}

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Shard Information\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(shardInfo));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    let shardInfo = `${emoji.wickarrow} **Current Shard:** ${client.shard?.ids?.[0] ?? 0}\n${emoji.wickarrow} **Total Shards:** ${client.shard?.count ?? 1}`;

    try {
      if (client.shard) {
        const guildCounts = await client.shard.fetchClientValues('guilds.cache.size');
        const totalGuilds = guildCounts.reduce((a, c) => a + c, 0);
        shardInfo += `\n${emoji.wickarrow} **Total Guilds:** ${totalGuilds}`;

        const shardStatus = await client.shard.broadcastEval(c => ({
          id: c.shard?.ids?.[0] ?? 0,
          guilds: c.guilds.cache.size,
          ping: c.ws.ping
        }));
        shardInfo += `\n\n${shardStatus.map(s => `Shard ${s.id}: ${s.guilds} guilds, ${s.ping}ms`).join('\n')}`;
      }
    } catch {}

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Shard Information\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(shardInfo));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
