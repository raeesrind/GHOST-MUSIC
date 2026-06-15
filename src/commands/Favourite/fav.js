const { MessageFlags } = require("discord.js");

const likeCmd = require("./like");
const likeallCmd = require("./likeall");
const playlikedCmd = require("./playliked");
const showlikedCmd = require("./showliked");
const unlikeCmd = require("./unlike");

module.exports = {
  name: "fav",
  description: "Favorite songs management commands",
  category: "Favourite",
  groupSlash: true,

  slashOptions: [
    {
      name: "like",
      description: "Add the current song to your favorites",
      type: 1
    },
    {
      name: "likeall",
      description: "Add all songs from the queue to your favorites",
      type: 1
    },
    {
      name: "playliked",
      description: "Play your favorite songs",
      type: 1
    },
    {
      name: "showliked",
      description: "Show your favorite songs",
      type: 1
    },
    {
      name: "unlike",
      description: "Remove songs from your favorites",
      type: 1
    }
  ],

  async slashExecute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    const wrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (opts) => {
        if (interaction.deferred) return interaction.editReply(opts);
        if (interaction.replied) return interaction.followUp(opts);
        return interaction.reply(opts);
      },
    };

    switch (sub) {
      case "like": return likeCmd.slashExecute(interaction, client);
      case "likeall": return likeallCmd.slashExecute(interaction, client);
      case "playliked": return playlikedCmd.slashExecute(interaction, client);
      case "showliked": return showlikedCmd.slashExecute(interaction, client);
      case "unlike": return unlikeCmd.slashExecute(interaction, client);
      default:
        return interaction.reply({
          content: `Unknown subcommand: ${sub}`,
          flags: MessageFlags.Ephemeral
        });
    }
  }
};
