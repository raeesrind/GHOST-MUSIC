const { SlashCommandBuilder } = require('discord.js');

const gstart = require('../Giveaway/gstart.js');
const gend = require('../Giveaway/gend.js');
const greroll = require('../Giveaway/greroll.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway management')
    .addSubcommand(sub =>
      sub
        .setName('gstart')
        .setDescription('Start a giveaway.')
          .addStringOption(opt =>
            opt
              .setName('prize')
              .setDescription('The prize for the giveaway')
             .setRequired(true)
          )
          .addStringOption(opt =>
            opt
              .setName('duration')
              .setDescription('The duration (e.g. 10m, 2h, 3d)')
             .setRequired(true)
          )
          .addIntegerOption(opt =>
            opt
              .setName('winners')
              .setDescription('The number of winners')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('gend')
        .setDescription('End a giveaway manually.')
          .addStringOption(opt =>
            opt
              .setName('giveaway')
              .setDescription('Select the giveaway to end')
             .setRequired(true)
             .setAutocomplete(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('greroll')
        .setDescription('Reroll a winner for an ended giveaway.')
          .addStringOption(opt =>
            opt
              .setName('giveaway')
              .setDescription('Select the giveaway to reroll')
             .setRequired(true)
             .setAutocomplete(true)
          )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'gstart':
      if (gstart.slashExecute) return gstart.slashExecute(interaction, interaction.client);
      return gstart.execute(interaction, [], interaction.client, '/');
    case 'gend':
      if (gend.slashExecute) return gend.slashExecute(interaction, interaction.client);
      return gend.execute(interaction, [], interaction.client, '/');
    case 'greroll':
      if (greroll.slashExecute) return greroll.slashExecute(interaction, interaction.client);
      return greroll.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'gend':
      return gend.autocomplete(interaction, interaction.client);
    case 'greroll':
      return greroll.autocomplete(interaction, interaction.client);
      default:
        break;
    }
  },
};
