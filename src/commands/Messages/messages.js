const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');
const { messageCounts } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'messages',
  aliases: ['m'],
  description: 'Displays the message count for a user in this server',
  category: 'Messages',
  usage: 'messages [user]',
  slashOptions: [
    { name: 'user', description: 'The user to check', type: 6, required: false }
  ],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    const data = messageCounts.get(interaction.guild.id, target.id);
    const today = new Date().toISOString().split('T')[0];
    const daily = data.last_date === today ? data.today : 0;
    const totalFormatted = (data.total || 0).toLocaleString('en-US');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} ${target.displayName}'s Messages\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**All time** • **${totalFormatted}** messages in this server\n**Today** • **${daily}** messages in this server`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Messages are being updated in real-time`));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    let target = message.author;
    if (args.length > 0) {
      const id = args[0].replace(/[<@!>]/g, '');
      try { target = await message.guild.members.fetch(id).then(m => m.user); } catch { target = message.author; }
    }
    const data = messageCounts.get(message.guild.id, target.id);
    const today = new Date().toISOString().split('T')[0];
    const daily = data.last_date === today ? data.today : 0;
    const totalFormatted = (data.total || 0).toLocaleString('en-US');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} ${target.displayName}'s Messages\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**All time** • **${totalFormatted}** messages in this server\n**Today** • **${daily}** messages in this server`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Messages are being updated in real-time`));

    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
