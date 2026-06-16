const { SlashCommandBuilder } = require('discord.js');

const ban = require('../Moderation/ban.js');
const kick = require('../Moderation/kick.js');
const mute = require('../Moderation/mute.js');
const unmute = require('../Moderation/unmute.js');
const unban = require('../Moderation/unban.js');
const purge = require('../Moderation/purge.js');
const lock = require('../Moderation/lock.js');
const unlock = require('../Moderation/unlock.js');
const lockall = require('../Moderation/lockall.js');
const unlockall = require('../Moderation/unlockall.js');
const hide = require('../Moderation/hide.js');
const unhide = require('../Moderation/unhide.js');
const hideall = require('../Moderation/hideall.js');
const unhideall = require('../Moderation/unhideall.js');
const nuke = require('../Moderation/nuke.js');
const rename = require('../Moderation/rename.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation and server management')
    .addSubcommand(sub =>
      sub
        .setName('ban')
        .setDescription('Ban a member from the server')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to ban')
             .setRequired(true)
          )
          .addStringOption(opt =>
            opt
              .setName('reason')
              .setDescription('Reason for banning')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('kick')
        .setDescription('Kick a member from the server')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to kick')
             .setRequired(true)
          )
          .addStringOption(opt =>
            opt
              .setName('reason')
              .setDescription('Reason for kicking')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('mute')
        .setDescription('Timeout a member in the server')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to mute')
             .setRequired(true)
          )
          .addStringOption(opt =>
            opt
              .setName('duration')
              .setDescription('Duration (e.g. 10m, 2h, 3d) - Default: 10m')
          )
          .addStringOption(opt =>
            opt
              .setName('reason')
              .setDescription('Reason for muting')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('unmute')
        .setDescription('Remove timeout from a member')
          .addUserOption(opt =>
            opt
              .setName('user')
              .setDescription('The user to unmute')
             .setRequired(true)
          )
          .addStringOption(opt =>
            opt
              .setName('reason')
              .setDescription('Reason for unmuting')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('unban')
        .setDescription('Unban a user from the server')
          .addStringOption(opt =>
            opt
              .setName('user')
              .setDescription('The user ID or tag to unban (or "all")')
             .setRequired(true)
          )
          .addStringOption(opt =>
            opt
              .setName('reason')
              .setDescription('Reason for unbanning')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('purge')
        .setDescription('Purge messages from the channel with various filters')
    )
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription('Locks the specified channel')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to lock')
             .addChannelTypes([0])
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('Unlocks the specified channel')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to unlock')
             .addChannelTypes([0])
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('lockall')
        .setDescription('Locks all text channels in the server')
    )
    .addSubcommand(sub =>
      sub
        .setName('unlockall')
        .setDescription('Unlocks all text channels in the server')
    )
    .addSubcommand(sub =>
      sub
        .setName('hide')
        .setDescription('Hides the specified channel')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to hide')
             .addChannelTypes([0])
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('unhide')
        .setDescription('Unhides the specified channel')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to unhide')
             .addChannelTypes([0])
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('hideall')
        .setDescription('Hides all text channels in the server')
    )
    .addSubcommand(sub =>
      sub
        .setName('unhideall')
        .setDescription('Unhides all text channels in the server')
    )
    .addSubcommand(sub =>
      sub
        .setName('nuke')
        .setDescription('Clones and deletes the channel')
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to clone and delete (defaults to current)')
             .addChannelTypes([0])
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('rename')
        .setDescription('Renames a specified channel')
          .addStringOption(opt =>
            opt
              .setName('name')
              .setDescription('The new name for the channel')
             .setRequired(true)
          )
          .addChannelOption(opt =>
            opt
              .setName('channel')
              .setDescription('The channel to rename')
             .addChannelTypes([0,2,4,5,13])
          )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'ban':
      if (ban.slashExecute) return ban.slashExecute(interaction, interaction.client);
      return ban.execute(interaction, [], interaction.client, '/');
    case 'kick':
      if (kick.slashExecute) return kick.slashExecute(interaction, interaction.client);
      return kick.execute(interaction, [], interaction.client, '/');
    case 'mute':
      if (mute.slashExecute) return mute.slashExecute(interaction, interaction.client);
      return mute.execute(interaction, [], interaction.client, '/');
    case 'unmute':
      if (unmute.slashExecute) return unmute.slashExecute(interaction, interaction.client);
      return unmute.execute(interaction, [], interaction.client, '/');
    case 'unban':
      if (unban.slashExecute) return unban.slashExecute(interaction, interaction.client);
      return unban.execute(interaction, [], interaction.client, '/');
    case 'purge':
      if (purge.slashExecute) return purge.slashExecute(interaction, interaction.client);
      return purge.execute(interaction, [], interaction.client, '/');
    case 'lock':
      if (lock.slashExecute) return lock.slashExecute(interaction, interaction.client);
      return lock.execute(interaction, [], interaction.client, '/');
    case 'unlock':
      if (unlock.slashExecute) return unlock.slashExecute(interaction, interaction.client);
      return unlock.execute(interaction, [], interaction.client, '/');
    case 'lockall':
      if (lockall.slashExecute) return lockall.slashExecute(interaction, interaction.client);
      return lockall.execute(interaction, [], interaction.client, '/');
    case 'unlockall':
      if (unlockall.slashExecute) return unlockall.slashExecute(interaction, interaction.client);
      return unlockall.execute(interaction, [], interaction.client, '/');
    case 'hide':
      if (hide.slashExecute) return hide.slashExecute(interaction, interaction.client);
      return hide.execute(interaction, [], interaction.client, '/');
    case 'unhide':
      if (unhide.slashExecute) return unhide.slashExecute(interaction, interaction.client);
      return unhide.execute(interaction, [], interaction.client, '/');
    case 'hideall':
      if (hideall.slashExecute) return hideall.slashExecute(interaction, interaction.client);
      return hideall.execute(interaction, [], interaction.client, '/');
    case 'unhideall':
      if (unhideall.slashExecute) return unhideall.slashExecute(interaction, interaction.client);
      return unhideall.execute(interaction, [], interaction.client, '/');
    case 'nuke':
      if (nuke.slashExecute) return nuke.slashExecute(interaction, interaction.client);
      return nuke.execute(interaction, [], interaction.client, '/');
    case 'rename':
      if (rename.slashExecute) return rename.slashExecute(interaction, interaction.client);
      return rename.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
