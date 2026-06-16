const { SlashCommandBuilder } = require('discord.js');

const branding = require('../Owner/branding.js');
const getinv = require('../Owner/getinv.js');
const importxp = require('../Owner/importxp.js');
const leaveserver = require('../Owner/leaveserver.js');
const mutual = require('../Owner/mutual.js');
const node = require('../Owner/node.js');
const serverlist = require('../Owner/serverlist.js');
const setnpchannel = require('../Owner/setnpchannel.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('Bot owner and administration commands')
    .addSubcommand(sub =>
      sub
        .setName('branding')
        .setDescription('Customize the bot\'s server profile (avatar, banner, bio, nickname).')
    )
    .addSubcommand(sub =>
      sub
        .setName('getinv')
        .setDescription('Get an invite link for a server where the bot is present')
          .addStringOption(opt =>
            opt
              .setName('server_id')
              .setDescription('The ID of the server to get an invite for')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('importxp')
        .setDescription('Import XP data from a replied ghost.db file into the bot database.')
    )
    .addSubcommand(sub =>
      sub
        .setName('leaveserver')
        .setDescription('Leave server')
          .addStringOption(opt =>
            opt
              .setName('guild_id')
              .setDescription('The ID of the guild to leave')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('mutual')
        .setDescription('Show mutual servers between the bot and a user|bot')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('User to check mutual servers with')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('node')
        .setDescription('Shows Node information.')
    )
    .addSubcommand(sub =>
      sub
        .setName('serverlist')
        .setDescription('Listing Of Servers')
    )
    .addSubcommand(sub =>
      sub
        .setName('setnpchannel')
        .setDescription('Set up a no-prefix access panel with buttons in the current channel')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'branding':
      if (branding.slashExecute) return branding.slashExecute(interaction, interaction.client);
      return branding.execute(interaction, [], interaction.client, '/');
    case 'getinv':
      if (getinv.slashExecute) return getinv.slashExecute(interaction, interaction.client);
      return getinv.execute(interaction, [], interaction.client, '/');
    case 'importxp':
      if (importxp.slashExecute) return importxp.slashExecute(interaction, interaction.client);
      return importxp.execute(interaction, [], interaction.client, '/');
    case 'leaveserver':
      if (leaveserver.slashExecute) return leaveserver.slashExecute(interaction, interaction.client);
      return leaveserver.execute(interaction, [], interaction.client, '/');
    case 'mutual':
      if (mutual.slashExecute) return mutual.slashExecute(interaction, interaction.client);
      return mutual.execute(interaction, [], interaction.client, '/');
    case 'node':
      if (node.slashExecute) return node.slashExecute(interaction, interaction.client);
      return node.execute(interaction, [], interaction.client, '/');
    case 'serverlist':
      if (serverlist.slashExecute) return serverlist.slashExecute(interaction, interaction.client);
      return serverlist.execute(interaction, [], interaction.client, '/');
    case 'setnpchannel':
      if (setnpchannel.slashExecute) return setnpchannel.slashExecute(interaction, interaction.client);
      return setnpchannel.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
