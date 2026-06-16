const { SlashCommandBuilder } = require('discord.js');

const messages = require('../Messages/messages.js');
const addmessages = require('../Messages/addmessages.js');
const removemessages = require('../Messages/removemessages.js');
const clearmessages = require('../Messages/clearmessages.js');
const resetmymessages = require('../Messages/resetmymessages.js');
const blacklistchannel = require('../Messages/blacklistchannel.js');
const unblacklistchannel = require('../Messages/unblacklistchannel.js');
const blacklistedchannels = require('../Messages/blacklistedchannels.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messages')
    .setDescription('Message tracking commands')
    .addSubcommand(sub =>
      sub
        .setName('messages')
        .setDescription('Displays the message count for a user in this server')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to check')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('addmessages')
        .setDescription('Manually add messages to a user\'s server count')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user')
             .setRequired(true)
          )
          .addIntegerOption(opt =>
            opt
              .setName('amount')
              .setDescription('Number of messages to add (max 5000)')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('removemessages')
        .setDescription('Manually remove messages from a user\'s server count')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user')
             .setRequired(true)
          )
          .addIntegerOption(opt =>
            opt
              .setName('amount')
              .setDescription('Number of messages to remove (max 5000)')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('clearmessages')
        .setDescription('Reset a user\'s message count in this server')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to clear messages for')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('resetmymessages')
        .setDescription('Reset your own message count in this server')
    )
    .addSubcommand(sub =>
      sub
        .setName('blacklistchannel')
        .setDescription('Blacklist a channel from message counting')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to blacklist')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('unblacklistchannel')
        .setDescription('Remove a channel from the message counting blacklist')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to unblacklist')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('blacklistedchannels')
        .setDescription('Lists all channels blacklisted from message counting')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'messages':
      if (messages.slashExecute) return messages.slashExecute(interaction, interaction.client);
      return messages.execute(interaction, [], interaction.client, '/');
    case 'addmessages':
      if (addmessages.slashExecute) return addmessages.slashExecute(interaction, interaction.client);
      return addmessages.execute(interaction, [], interaction.client, '/');
    case 'removemessages':
      if (removemessages.slashExecute) return removemessages.slashExecute(interaction, interaction.client);
      return removemessages.execute(interaction, [], interaction.client, '/');
    case 'clearmessages':
      if (clearmessages.slashExecute) return clearmessages.slashExecute(interaction, interaction.client);
      return clearmessages.execute(interaction, [], interaction.client, '/');
    case 'resetmymessages':
      if (resetmymessages.slashExecute) return resetmymessages.slashExecute(interaction, interaction.client);
      return resetmymessages.execute(interaction, [], interaction.client, '/');
    case 'blacklistchannel':
      if (blacklistchannel.slashExecute) return blacklistchannel.slashExecute(interaction, interaction.client);
      return blacklistchannel.execute(interaction, [], interaction.client, '/');
    case 'unblacklistchannel':
      if (unblacklistchannel.slashExecute) return unblacklistchannel.slashExecute(interaction, interaction.client);
      return unblacklistchannel.execute(interaction, [], interaction.client, '/');
    case 'blacklistedchannels':
      if (blacklistedchannels.slashExecute) return blacklistedchannels.slashExecute(interaction, interaction.client);
      return blacklistedchannels.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
