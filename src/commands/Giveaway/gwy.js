const { MessageFlags } = require("discord.js");

const gstartCmd = require("./gstart");
const gendCmd = require("./gend");
const grerollCmd = require("./greroll");

module.exports = {
  name: "gwy",
  description: "Giveaway management commands",
  category: "Giveaway",
  groupSlash: true,

  slashOptions: [
    {
      name: "start",
      description: "Start a giveaway",
      type: 1,
      options: [
        {
          name: "prize",
          description: "The prize for the giveaway",
          type: 3,
          required: true
        },
        {
          name: "duration",
          description: "Duration (e.g. 10m, 2h, 3d)",
          type: 3,
          required: true
        },
        {
          name: "winners",
          description: "Number of winners",
          type: 4,
          required: true
        }
      ]
    },
    {
      name: "end",
      description: "End a giveaway manually",
      type: 1,
      options: [
        {
          name: "giveaway",
          description: "Select the giveaway to end",
          type: 3,
          required: true,
          autocomplete: true
        }
      ]
    },
    {
      name: "reroll",
      description: "Reroll a winner for an ended giveaway",
      type: 1,
      options: [
        {
          name: "giveaway",
          description: "Select the giveaway to reroll",
          type: 3,
          required: true,
          autocomplete: true
        }
      ]
    }
  ],

  autocomplete: async (interaction, client) => {
    const sub = interaction.options.getSubcommand();
    if (sub === "end") return gendCmd.autocomplete(interaction, client);
    if (sub === "reroll") return grerollCmd.autocomplete(interaction, client);
  },

  async slashExecute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case "start": return gstartCmd.slashExecute(interaction, client);
      case "end": return gendCmd.slashExecute(interaction, client);
      case "reroll": return grerollCmd.slashExecute(interaction, client);
      default:
        return interaction.reply({
          content: `Unknown subcommand: ${sub}`,
          flags: MessageFlags.Ephemeral
        });
    }
  }
};
