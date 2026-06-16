const { SlashCommandBuilder } = require('discord.js');

const deleteprefix = require('../Utility/deleteprefix.js');
const premium = require('../Utility/premium.js');
const sponsor = require('../Utility/sponsor.js');
const shards = require('../Utility/shards.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('util-2')
    .setDescription('More utility commands')
    .addSubcommand(sub =>
      sub
        .setName('deleteprefix')
        .setDescription('Resets the server prefix to the default')
    )
    .addSubcommand(sub =>
      sub
        .setName('premium')
        .setDescription('Shows information about Ghost Premium')
    )
    .addSubcommand(sub =>
      sub
        .setName('sponsor')
        .setDescription('Displays the information about the sponsors of the bot')
    )
    .addSubcommand(sub =>
      sub
        .setName('shards')
        .setDescription('Displays the information about the shards')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'deleteprefix':
      if (deleteprefix.slashExecute) return deleteprefix.slashExecute(interaction, interaction.client);
      return deleteprefix.execute(interaction, [], interaction.client, '/');
    case 'premium':
      if (premium.slashExecute) return premium.slashExecute(interaction, interaction.client);
      return premium.execute(interaction, [], interaction.client, '/');
    case 'sponsor':
      if (sponsor.slashExecute) return sponsor.slashExecute(interaction, interaction.client);
      return sponsor.execute(interaction, [], interaction.client, '/');
    case 'shards':
      if (shards.slashExecute) return shards.slashExecute(interaction, interaction.client);
      return shards.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
