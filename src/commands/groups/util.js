const { SlashCommandBuilder } = require('discord.js');

const avatar = require('../Utility/avatar.js');
const banner = require('../Utility/banner.js');
const servericon = require('../Utility/servericon.js');
const serverbanner = require('../Utility/serverbanner.js');
const serverinfo = require('../Utility/serverinfo.js');
const userinfo = require('../Utility/userinfo.js');
const channelinfo = require('../Utility/channelinfo.js');
const roleinfo = require('../Utility/roleinfo.js');
const vcinfo = require('../Utility/vcinfo.js');
const botinfo = require('../Utility/botinfo.js');
const membercount = require('../Utility/membercount.js');
const accountage = require('../Utility/accountage.js');
const permissions = require('../Utility/permissions.js');
const audit = require('../Utility/audit.js');
const checkvanity = require('../Utility/checkvanity.js');
const firstmsg = require('../Utility/firstmsg.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('util')
    .setDescription('Utility and information commands')
    .addSubcommand(sub =>
      sub
        .setName('avatar')
        .setDescription('Displays a user\'s avatar with download links.')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user whose avatar you want to see')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('banner')
        .setDescription('Displays a user\'s banner with download link.')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user whose banner you want to see')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('servericon')
        .setDescription('Displays the server\'s icon with download link.')
          .addStringOption(opt =>
            opt
              .setName('guildid')
              .setDescription('The guild ID to view icon from')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('serverbanner')
        .setDescription('Displays the server\'s banner with download link.')
          .addStringOption(opt =>
            opt
              .setName('guildid')
              .setDescription('The guild ID to view banner from')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('serverinfo')
        .setDescription('Get detailed information about the server')
    )
    .addSubcommand(sub =>
      sub
        .setName('userinfo')
        .setDescription('Get detailed information about a user')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to get information about')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('channelinfo')
        .setDescription('Get detailed information about a channel')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to get information about')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('roleinfo')
        .setDescription('Get detailed information about a role')
          .addRoleOption(opt =>
            opt
              .setName('role')
              .setDescription('The role to get information about')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('vcinfo')
        .setDescription('Displays the information about a voice channel')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The voice channel to inspect')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('botinfo')
        .setDescription('Displays the information about the bot')
    )
    .addSubcommand(sub =>
      sub
        .setName('membercount')
        .setDescription('Displays detailed server member statistics.')
    )
    .addSubcommand(sub =>
      sub
        .setName('accountage')
        .setDescription('Displays the account age of a user')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to check')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('permissions')
        .setDescription('Displays information about what permissions the bot requires')
    )
    .addSubcommand(sub =>
      sub
        .setName('audit')
        .setDescription('View recent server audit logs')
    )
    .addSubcommand(sub =>
      sub
        .setName('checkvanity')
        .setDescription('Check if a vanity URL is available or taken')
          .addStringOption(opt =>
            opt
              .setName('code')
              .setDescription('The vanity code to check (e.g. "groove")')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('firstmsg')
        .setDescription('Get the first message sent in the channel')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to get the first message from')
          )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'avatar':
      if (avatar.slashExecute) return avatar.slashExecute(interaction, interaction.client);
      return avatar.execute(interaction, [], interaction.client, '/');
    case 'banner':
      if (banner.slashExecute) return banner.slashExecute(interaction, interaction.client);
      return banner.execute(interaction, [], interaction.client, '/');
    case 'servericon':
      if (servericon.slashExecute) return servericon.slashExecute(interaction, interaction.client);
      return servericon.execute(interaction, [], interaction.client, '/');
    case 'serverbanner':
      if (serverbanner.slashExecute) return serverbanner.slashExecute(interaction, interaction.client);
      return serverbanner.execute(interaction, [], interaction.client, '/');
    case 'serverinfo':
      if (serverinfo.slashExecute) return serverinfo.slashExecute(interaction, interaction.client);
      return serverinfo.execute(interaction, [], interaction.client, '/');
    case 'userinfo':
      if (userinfo.slashExecute) return userinfo.slashExecute(interaction, interaction.client);
      return userinfo.execute(interaction, [], interaction.client, '/');
    case 'channelinfo':
      if (channelinfo.slashExecute) return channelinfo.slashExecute(interaction, interaction.client);
      return channelinfo.execute(interaction, [], interaction.client, '/');
    case 'roleinfo':
      if (roleinfo.slashExecute) return roleinfo.slashExecute(interaction, interaction.client);
      return roleinfo.execute(interaction, [], interaction.client, '/');
    case 'vcinfo':
      if (vcinfo.slashExecute) return vcinfo.slashExecute(interaction, interaction.client);
      return vcinfo.execute(interaction, [], interaction.client, '/');
    case 'botinfo':
      if (botinfo.slashExecute) return botinfo.slashExecute(interaction, interaction.client);
      return botinfo.execute(interaction, [], interaction.client, '/');
    case 'membercount':
      if (membercount.slashExecute) return membercount.slashExecute(interaction, interaction.client);
      return membercount.execute(interaction, [], interaction.client, '/');
    case 'accountage':
      if (accountage.slashExecute) return accountage.slashExecute(interaction, interaction.client);
      return accountage.execute(interaction, [], interaction.client, '/');
    case 'permissions':
      if (permissions.slashExecute) return permissions.slashExecute(interaction, interaction.client);
      return permissions.execute(interaction, [], interaction.client, '/');
    case 'audit':
      if (audit.slashExecute) return audit.slashExecute(interaction, interaction.client);
      return audit.execute(interaction, [], interaction.client, '/');
    case 'checkvanity':
      if (checkvanity.slashExecute) return checkvanity.slashExecute(interaction, interaction.client);
      return checkvanity.execute(interaction, [], interaction.client, '/');
    case 'firstmsg':
      if (firstmsg.slashExecute) return firstmsg.slashExecute(interaction, interaction.client);
      return firstmsg.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
