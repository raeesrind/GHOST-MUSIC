const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'accountage',
  aliases: ['age', 'accage'],
  description: 'Displays the account age of a user',
  category: 'Utility',
  usage: 'accountage [user]',
  slashOptions: [
    { name: 'user', description: 'The user to check', type: 6, required: false }
  ],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    const created = Math.floor(target.createdTimestamp / 1000);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} ${target.displayName}'s Account Age\n-# Requested by ${interaction.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} **Account Created:** <t:${created}:R>\n${emoji.wickarrow} **Date:** <t:${created}:f>`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client) {
    let target = message.author;
    if (args.length > 0) {
      const id = args[0].replace(/[<@!>]/g, '');
      try { target = await client.users.fetch(id); } catch { target = message.author; }
    }
    const created = Math.floor(target.createdTimestamp / 1000);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} ${target.displayName}'s Account Age\n-# Requested by ${message.author.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} **Account Created:** <t:${created}:R>\n${emoji.wickarrow} **Date:** <t:${created}:f>`));
    await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
