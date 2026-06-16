const { SlashCommandBuilder } = require('discord.js');

const greet = require('../Greet/greet.js');
const greetsetup = require('../Greet/greetsetup.js');
const greetchannels = require('../Greet/greetchannels.js');
const greetreset = require('../Greet/greetreset.js');
const greetvariables = require('../Greet/greetvariables.js');
const disablegreet = require('../Greet/disablegreet.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Welcome and greeting system')
    .addSubcommand(sub =>
      sub
        .setName('greet')
        .setDescription('Set the channel where greet messages will be sent')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel for greet messages')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('greetsetup')
        .setDescription('Set up greet messages for new members')
    )
    .addSubcommand(sub =>
      sub
        .setName('greetchannels')
        .setDescription('Display all configured greet channels for this server')
    )
    .addSubcommand(sub =>
      sub
        .setName('greetreset')
        .setDescription('Reset all greet settings for this server')
    )
    .addSubcommand(sub =>
      sub
        .setName('greetvariables')
        .setDescription('List all available greet message variables')
    )
    .addSubcommand(sub =>
      sub
        .setName('disablegreet')
        .setDescription('Remove a greet channel configuration')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The greet channel to remove')
          )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'greet':
      if (greet.slashExecute) return greet.slashExecute(interaction, interaction.client);
      return greet.execute(interaction, [], interaction.client, '/');
    case 'greetsetup':
      if (greetsetup.slashExecute) return greetsetup.slashExecute(interaction, interaction.client);
      return greetsetup.execute(interaction, [], interaction.client, '/');
    case 'greetchannels':
      if (greetchannels.slashExecute) return greetchannels.slashExecute(interaction, interaction.client);
      return greetchannels.execute(interaction, [], interaction.client, '/');
    case 'greetreset':
      if (greetreset.slashExecute) return greetreset.slashExecute(interaction, interaction.client);
      return greetreset.execute(interaction, [], interaction.client, '/');
    case 'greetvariables':
      if (greetvariables.slashExecute) return greetvariables.slashExecute(interaction, interaction.client);
      return greetvariables.execute(interaction, [], interaction.client, '/');
    case 'disablegreet':
      if (disablegreet.slashExecute) return disablegreet.slashExecute(interaction, interaction.client);
      return disablegreet.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
