const { SlashCommandBuilder } = require('discord.js');

const ping = require('../Information/ping.js');
const stats = require('../Information/stats.js');
const help = require('../Information/help.js');
const invite = require('../Information/invite.js');
const links = require('../Information/links.js');
const support = require('../Information/support.js');
const profile = require('../Information/profile.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('information')
    .setDescription('Bot information commands')
    .addSubcommand(sub =>
      sub
        .setName('ping')
        .setDescription('Displays the bot\'s various latencies.')
    )
    .addSubcommand(sub =>
      sub
        .setName('stats')
        .setDescription('Show detailed bot statistics')
    )
    .addSubcommand(sub =>
      sub
        .setName('help')
        .setDescription('Shows all commands with categories')
          .addStringOption(opt =>
            opt
              .setName('command')
              .setDescription('Shows about a specific command')
             .setAutocomplete(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('invite')
        .setDescription('Get the bot\'s invite link')
    )
    .addSubcommand(sub =>
      sub
        .setName('links')
        .setDescription('Get invite links for all sub-bots')
    )
    .addSubcommand(sub =>
      sub
        .setName('support')
        .setDescription('Get the support server invite link')
    )
    .addSubcommand(sub =>
      sub
        .setName('profile')
        .setDescription('Displays your custom bot profile image.')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user whose profile you want to see')
          )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'ping':
      if (ping.slashExecute) return ping.slashExecute(interaction, interaction.client);
      return ping.execute(interaction, [], interaction.client, '/');
    case 'stats':
      if (stats.slashExecute) return stats.slashExecute(interaction, interaction.client);
      return stats.execute(interaction, [], interaction.client, '/');
    case 'help':
      if (help.slashExecute) return help.slashExecute(interaction, interaction.client);
      return help.execute(interaction, [], interaction.client, '/');
    case 'invite':
      if (invite.slashExecute) return invite.slashExecute(interaction, interaction.client);
      return invite.execute(interaction, [], interaction.client, '/');
    case 'links':
      if (links.slashExecute) return links.slashExecute(interaction, interaction.client);
      return links.execute(interaction, [], interaction.client, '/');
    case 'support':
      if (support.slashExecute) return support.slashExecute(interaction, interaction.client);
      return support.execute(interaction, [], interaction.client, '/');
    case 'profile':
      if (profile.slashExecute) return profile.slashExecute(interaction, interaction.client);
      return profile.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'help':
      return help.autocomplete(interaction, interaction.client);
      default:
        break;
    }
  },
};
