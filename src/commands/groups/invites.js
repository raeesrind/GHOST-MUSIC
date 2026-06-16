const { SlashCommandBuilder } = require('discord.js');

const invites = require('../Tracker/invites.js');
const inviter = require('../Tracker/inviter.js');
const invited = require('../Tracker/invited.js');
const invitecodes = require('../Tracker/invitecodes.js');
const lbinvites = require('../Tracker/leaderboard.js');
const addinvites = require('../Tracker/addinvites.js');
const removeinvites = require('../Tracker/removeinvites.js');
const clearinvites = require('../Tracker/clearinvites.js');
const resetmyinvites = require('../Tracker/resetmyinvites.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Invite tracking and statistics')
    .addSubcommand(sub =>
      sub
        .setName('invites')
        .setDescription('Displays the invite statistics of a member including total invites, joins, left, fake, and rejoins.')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to check invite stats for')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('inviter')
        .setDescription('Shows who invited you or another user to the server')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to check the inviter for')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('invited')
        .setDescription('Shows all the people you invited to the server')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to check invited members for')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('invitecodes')
        .setDescription('Show all invite codes created by a user with their usage counts')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to check invite codes for')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('lbinvites')
        .setDescription('Shows the invite leaderboard for this server')
          .addStringOption(opt =>
            opt
              .setName('type')
              .setDescription('Type of leaderboard')
             .setRequired(true)
             .addChoices({ name: 'Invites', value: 'invites' })
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('addinvites')
        .setDescription('Add invites to a user')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user')
             .setRequired(true)
          )
          .addIntegerOption(opt =>
            opt
              .setName('amount')
              .setDescription('Number of invites to add')
             .setRequired(true)
          )
          .addStringOption(opt =>
            opt
              .setName('type')
              .setDescription('Type of invites')
             .setRequired(true)
             .addChoices({ name: 'total', value: 'total' })
             .addChoices({ name: 'fake', value: 'fake' })
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('removeinvites')
        .setDescription('Remove invites from a user')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user')
             .setRequired(true)
          )
          .addIntegerOption(opt =>
            opt
              .setName('amount')
              .setDescription('Number of invites to remove')
             .setRequired(true)
          )
          .addStringOption(opt =>
            opt
              .setName('type')
              .setDescription('Type of invites')
             .setRequired(true)
             .addChoices({ name: 'total', value: 'total' })
             .addChoices({ name: 'fake', value: 'fake' })
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('clearinvites')
        .setDescription('Clear invite tracking data for this server or a specific member')
          .addStringOption(opt =>
            opt
              .setName('target')
              .setDescription('Clear all invites or for a specific member')
             .setRequired(true)
             .addChoices({ name: 'All', value: 'all' })
          )
          .addUserOption(opt =>
            opt
              .setName('member')
              .setDescription('The member to clear invite data for')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('resetmyinvites')
        .setDescription('Reset your own invite statistics in this server')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'invites':
      if (invites.slashExecute) return invites.slashExecute(interaction, interaction.client);
      return invites.execute(interaction, [], interaction.client, '/');
    case 'inviter':
      if (inviter.slashExecute) return inviter.slashExecute(interaction, interaction.client);
      return inviter.execute(interaction, [], interaction.client, '/');
    case 'invited':
      if (invited.slashExecute) return invited.slashExecute(interaction, interaction.client);
      return invited.execute(interaction, [], interaction.client, '/');
    case 'invitecodes':
      if (invitecodes.slashExecute) return invitecodes.slashExecute(interaction, interaction.client);
      return invitecodes.execute(interaction, [], interaction.client, '/');
    case 'lbinvites':
      if (lbinvites.slashExecute) return lbinvites.slashExecute(interaction, interaction.client);
      return lbinvites.execute(interaction, [], interaction.client, '/');
    case 'addinvites':
      if (addinvites.slashExecute) return addinvites.slashExecute(interaction, interaction.client);
      return addinvites.execute(interaction, [], interaction.client, '/');
    case 'removeinvites':
      if (removeinvites.slashExecute) return removeinvites.slashExecute(interaction, interaction.client);
      return removeinvites.execute(interaction, [], interaction.client, '/');
    case 'clearinvites':
      if (clearinvites.slashExecute) return clearinvites.slashExecute(interaction, interaction.client);
      return clearinvites.execute(interaction, [], interaction.client, '/');
    case 'resetmyinvites':
      if (resetmyinvites.slashExecute) return resetmyinvites.slashExecute(interaction, interaction.client);
      return resetmyinvites.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
