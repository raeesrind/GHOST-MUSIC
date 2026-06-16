const { SlashCommandBuilder } = require('discord.js');

const add = require('../Ticket/add.js');
const close = require('../Ticket/close.js');
const _delete = require('../Ticket/delete.js');
const remove = require('../Ticket/remove.js');
const reopen = require('../Ticket/reopen.js');
const panel = require('../Ticket/panel.js');
const tsettings = require('../Ticket/settings.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Support ticket system')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a user to the ticket')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('User to add to the ticket')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('close')
        .setDescription('Close a ticket')
          .addStringOption(opt =>
            opt
              .setName('reason')
              .setDescription('Reason for closing')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a closed ticket')
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the ticket')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('User to remove from the ticket')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('reopen')
        .setDescription('Reopen a closed ticket')
    )
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Manage ticket panels')
    )
    .addSubcommand(sub =>
      sub
        .setName('tsettings')
        .setDescription('Configure ticket system settings')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'add':
      if (add.slashExecute) return add.slashExecute(interaction, interaction.client);
      return add.execute(interaction, [], interaction.client, '/');
    case 'close':
      if (close.slashExecute) return close.slashExecute(interaction, interaction.client);
      return close.execute(interaction, [], interaction.client, '/');
    case 'delete':
      if (_delete.slashExecute) return _delete.slashExecute(interaction, interaction.client);
      return _delete.execute(interaction, [], interaction.client, '/');
    case 'remove':
      if (remove.slashExecute) return remove.slashExecute(interaction, interaction.client);
      return remove.execute(interaction, [], interaction.client, '/');
    case 'reopen':
      if (reopen.slashExecute) return reopen.slashExecute(interaction, interaction.client);
      return reopen.execute(interaction, [], interaction.client, '/');
    case 'panel':
      if (panel.slashExecute) return panel.slashExecute(interaction, interaction.client);
      return panel.execute(interaction, [], interaction.client, '/');
    case 'tsettings':
      if (tsettings.slashExecute) return tsettings.slashExecute(interaction, interaction.client);
      return tsettings.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
