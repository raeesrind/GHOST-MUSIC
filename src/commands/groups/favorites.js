const { SlashCommandBuilder } = require('discord.js');

const like = require('../Favourite/like.js');
const unlike = require('../Favourite/unlike.js');
const likeall = require('../Favourite/likeall.js');
const showliked = require('../Favourite/showliked.js');
const playliked = require('../Favourite/playliked.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('favorites')
    .setDescription('Your favorite songs')
    .addSubcommand(sub =>
      sub
        .setName('like')
        .setDescription('Add current song to your favorites')
    )
    .addSubcommand(sub =>
      sub
        .setName('unlike')
        .setDescription('Remove songs from your favorites')
    )
    .addSubcommand(sub =>
      sub
        .setName('likeall')
        .setDescription('Add all songs from the current queue to your favorites')
    )
    .addSubcommand(sub =>
      sub
        .setName('showliked')
        .setDescription('Show your favorite songs')
    )
    .addSubcommand(sub =>
      sub
        .setName('playliked')
        .setDescription('Play your favorite songs')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'like':
      if (like.slashExecute) return like.slashExecute(interaction, interaction.client);
      return like.execute(interaction, [], interaction.client, '/');
    case 'unlike':
      if (unlike.slashExecute) return unlike.slashExecute(interaction, interaction.client);
      return unlike.execute(interaction, [], interaction.client, '/');
    case 'likeall':
      if (likeall.slashExecute) return likeall.slashExecute(interaction, interaction.client);
      return likeall.execute(interaction, [], interaction.client, '/');
    case 'showliked':
      if (showliked.slashExecute) return showliked.slashExecute(interaction, interaction.client);
      return showliked.execute(interaction, [], interaction.client, '/');
    case 'playliked':
      if (playliked.slashExecute) return playliked.slashExecute(interaction, interaction.client);
      return playliked.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
