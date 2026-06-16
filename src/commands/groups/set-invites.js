const { SlashCommandBuilder } = require('discord.js');

const invitetracking = require('../Tracker/invitetracking.js');
const setjoinchannel = require('../Tracker/setjoinchannel.js');
const setjoinmessage = require('../Tracker/setjoinmessage.js');
const setleavechannel = require('../Tracker/setleavechannel.js');
const setleavemessage = require('../Tracker/setleavemessage.js');
const unsetjoinmessage = require('../Tracker/unsetjoinmessage.js');
const unsetleavechannel = require('../Tracker/unsetleavechannel.js');
const unsetleavemessage = require('../Tracker/unsetleavemessage.js');
const unsetwelcomechannel = require('../Tracker/unsetwelcomechannel.js');
const testmessage = require('../Tracker/testmessage.js');
const variables = require('../Tracker/variables.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-invites')
    .setDescription('Invite tracking configuration')
    .addSubcommand(sub =>
      sub
        .setName('invitetracking')
        .setDescription('Enable or disable invite tracking for this server')
          .addStringOption(opt =>
            opt
              .setName('action')
              .setDescription('Enable or disable invite tracking')
             .setRequired(true)
             .addChoices({ name: 'Enable', value: 'enable' })
             .addChoices({ name: 'Disable', value: 'disable' })
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('setjoinchannel')
        .setDescription('Set the channel where invite welcome messages are sent')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The welcome channel')
             .addChannelTypes([0])
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('setjoinmessage')
        .setDescription('Set a custom join message for the invite logger')
          .addStringOption(opt =>
            opt
              .setName('message')
              .setDescription('The join message template')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('setleavechannel')
        .setDescription('Set the channel where member leave messages will be sent')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The leave channel')
             .addChannelTypes([0])
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('setleavemessage')
        .setDescription('Set a custom leave message for the invite logger')
          .addStringOption(opt =>
            opt
              .setName('message')
              .setDescription('The leave message template')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('unsetjoinmessage')
        .setDescription('Reset the join message back to the default')
    )
    .addSubcommand(sub =>
      sub
        .setName('unsetleavechannel')
        .setDescription('Unset the leave channel and disable member leave messages')
    )
    .addSubcommand(sub =>
      sub
        .setName('unsetleavemessage')
        .setDescription('Reset the leave message back to the default')
    )
    .addSubcommand(sub =>
      sub
        .setName('unsetwelcomechannel')
        .setDescription('Unset the welcome channel and disable invite welcome messages')
    )
    .addSubcommand(sub =>
      sub
        .setName('testmessage')
        .setDescription('Preview a message template with your own data as an example')
          .addStringOption(opt =>
            opt
              .setName('message')
              .setDescription('The message template to preview')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('variables')
        .setDescription('List all available invite logger message variables')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'invitetracking':
      if (invitetracking.slashExecute) return invitetracking.slashExecute(interaction, interaction.client);
      return invitetracking.execute(interaction, [], interaction.client, '/');
    case 'setjoinchannel':
      if (setjoinchannel.slashExecute) return setjoinchannel.slashExecute(interaction, interaction.client);
      return setjoinchannel.execute(interaction, [], interaction.client, '/');
    case 'setjoinmessage':
      if (setjoinmessage.slashExecute) return setjoinmessage.slashExecute(interaction, interaction.client);
      return setjoinmessage.execute(interaction, [], interaction.client, '/');
    case 'setleavechannel':
      if (setleavechannel.slashExecute) return setleavechannel.slashExecute(interaction, interaction.client);
      return setleavechannel.execute(interaction, [], interaction.client, '/');
    case 'setleavemessage':
      if (setleavemessage.slashExecute) return setleavemessage.slashExecute(interaction, interaction.client);
      return setleavemessage.execute(interaction, [], interaction.client, '/');
    case 'unsetjoinmessage':
      if (unsetjoinmessage.slashExecute) return unsetjoinmessage.slashExecute(interaction, interaction.client);
      return unsetjoinmessage.execute(interaction, [], interaction.client, '/');
    case 'unsetleavechannel':
      if (unsetleavechannel.slashExecute) return unsetleavechannel.slashExecute(interaction, interaction.client);
      return unsetleavechannel.execute(interaction, [], interaction.client, '/');
    case 'unsetleavemessage':
      if (unsetleavemessage.slashExecute) return unsetleavemessage.slashExecute(interaction, interaction.client);
      return unsetleavemessage.execute(interaction, [], interaction.client, '/');
    case 'unsetwelcomechannel':
      if (unsetwelcomechannel.slashExecute) return unsetwelcomechannel.slashExecute(interaction, interaction.client);
      return unsetwelcomechannel.execute(interaction, [], interaction.client, '/');
    case 'testmessage':
      if (testmessage.slashExecute) return testmessage.slashExecute(interaction, interaction.client);
      return testmessage.execute(interaction, [], interaction.client, '/');
    case 'variables':
      if (variables.slashExecute) return variables.slashExecute(interaction, interaction.client);
      return variables.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
