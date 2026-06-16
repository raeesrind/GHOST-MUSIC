const { SlashCommandBuilder } = require('discord.js');

const play = require('../Music/play.js');
const pause = require('../Music/pause.js');
const resume = require('../Music/resume.js');
const stop = require('../Music/stop.js');
const skip = require('../Music/skip.js');
const skipto = require('../Music/skipto.js');
const forceskip = require('../Music/forceskip.js');
const previous = require('../Music/previous.js');
const shuffle = require('../Music/shuffle.js');
const loop = require('../Music/loop.js');
const queue = require('../Music/queue.js');
const clearqueue = require('../Music/clearqueue.js');
const remove = require('../Music/remove.js');
const move = require('../Music/move.js');
const nowplaying = require('../Music/nowplaying.js');
const join = require('../Music/join.js');
const leave = require('../Music/leave.js');
const volume = require('../Music/volume.js');
const seek = require('../Music/seek.js');
const forward = require('../Music/forward.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Music playback controls')
    .addSubcommand(sub =>
      sub
        .setName('play')
        .setDescription('Plays a song or playlist.')
          .addStringOption(opt =>
            opt
              .setName('song')
              .setDescription('Song name or URL to play')
             .setRequired(true)
             .setAutocomplete(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('pause')
        .setDescription('Pause the currently playing music')
    )
    .addSubcommand(sub =>
      sub
        .setName('resume')
        .setDescription('Resume currently playing music')
    )
    .addSubcommand(sub =>
      sub
        .setName('stop')
        .setDescription('Stops the music')
    )
    .addSubcommand(sub =>
      sub
        .setName('skip')
        .setDescription('Skip the current song instantly.')
    )
    .addSubcommand(sub =>
      sub
        .setName('skipto')
        .setDescription('Skip to a specific song in the queue')
          .addIntegerOption(opt =>
            opt
              .setName('position')
              .setDescription('Position in queue to skip to')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('forceskip')
        .setDescription('To force skip the current playing song.')
    )
    .addSubcommand(sub =>
      sub
        .setName('previous')
        .setDescription('Play the previous song from history')
    )
    .addSubcommand(sub =>
      sub
        .setName('shuffle')
        .setDescription('Shuffle queue')
    )
    .addSubcommand(sub =>
      sub
        .setName('loop')
        .setDescription('Toggle music loop')
    )
    .addSubcommand(sub =>
      sub
        .setName('queue')
        .setDescription('Show the server queue')
    )
    .addSubcommand(sub =>
      sub
        .setName('clearqueue')
        .setDescription('Removes all songs in the music queue.')
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove tracks from the queue')
    )
    .addSubcommand(sub =>
      sub
        .setName('move')
        .setDescription('Move the bot to your current voice channel')
    )
    .addSubcommand(sub =>
      sub
        .setName('nowplaying')
        .setDescription('Show the current playing song')
    )
    .addSubcommand(sub =>
      sub
        .setName('join')
        .setDescription('Join voice channel')
    )
    .addSubcommand(sub =>
      sub
        .setName('leave')
        .setDescription('Leave voice channel')
    )
    .addSubcommand(sub =>
      sub
        .setName('volume')
        .setDescription('Change volume of currently playing music')
          .addIntegerOption(opt =>
            opt
              .setName('amount')
              .setDescription('Volume amount (0-100)')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('seek')
        .setDescription('Seek the currently playing song')
          .addStringOption(opt =>
            opt
              .setName('time')
              .setDescription('Time to seek to (e.g. 40, 1:30, 10s, 1m)')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('forward')
        .setDescription('Fast forward the current song by specified seconds')
          .addIntegerOption(opt =>
            opt
              .setName('seconds')
              .setDescription('Seconds to fast-forward')
          )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'play':
      if (play.slashExecute) return play.slashExecute(interaction, interaction.client);
      return play.execute(interaction, [], interaction.client, '/');
    case 'pause':
      if (pause.slashExecute) return pause.slashExecute(interaction, interaction.client);
      return pause.execute(interaction, [], interaction.client, '/');
    case 'resume':
      if (resume.slashExecute) return resume.slashExecute(interaction, interaction.client);
      return resume.execute(interaction, [], interaction.client, '/');
    case 'stop':
      if (stop.slashExecute) return stop.slashExecute(interaction, interaction.client);
      return stop.execute(interaction, [], interaction.client, '/');
    case 'skip':
      if (skip.slashExecute) return skip.slashExecute(interaction, interaction.client);
      return skip.execute(interaction, [], interaction.client, '/');
    case 'skipto':
      if (skipto.slashExecute) return skipto.slashExecute(interaction, interaction.client);
      return skipto.execute(interaction, [], interaction.client, '/');
    case 'forceskip':
      if (forceskip.slashExecute) return forceskip.slashExecute(interaction, interaction.client);
      return forceskip.execute(interaction, [], interaction.client, '/');
    case 'previous':
      if (previous.slashExecute) return previous.slashExecute(interaction, interaction.client);
      return previous.execute(interaction, [], interaction.client, '/');
    case 'shuffle':
      if (shuffle.slashExecute) return shuffle.slashExecute(interaction, interaction.client);
      return shuffle.execute(interaction, [], interaction.client, '/');
    case 'loop':
      if (loop.slashExecute) return loop.slashExecute(interaction, interaction.client);
      return loop.execute(interaction, [], interaction.client, '/');
    case 'queue':
      if (queue.slashExecute) return queue.slashExecute(interaction, interaction.client);
      return queue.execute(interaction, [], interaction.client, '/');
    case 'clearqueue':
      if (clearqueue.slashExecute) return clearqueue.slashExecute(interaction, interaction.client);
      return clearqueue.execute(interaction, [], interaction.client, '/');
    case 'remove':
      if (remove.slashExecute) return remove.slashExecute(interaction, interaction.client);
      return remove.execute(interaction, [], interaction.client, '/');
    case 'move':
      if (move.slashExecute) return move.slashExecute(interaction, interaction.client);
      return move.execute(interaction, [], interaction.client, '/');
    case 'nowplaying':
      if (nowplaying.slashExecute) return nowplaying.slashExecute(interaction, interaction.client);
      return nowplaying.execute(interaction, [], interaction.client, '/');
    case 'join':
      if (join.slashExecute) return join.slashExecute(interaction, interaction.client);
      return join.execute(interaction, [], interaction.client, '/');
    case 'leave':
      if (leave.slashExecute) return leave.slashExecute(interaction, interaction.client);
      return leave.execute(interaction, [], interaction.client, '/');
    case 'volume':
      if (volume.slashExecute) return volume.slashExecute(interaction, interaction.client);
      return volume.execute(interaction, [], interaction.client, '/');
    case 'seek':
      if (seek.slashExecute) return seek.slashExecute(interaction, interaction.client);
      return seek.execute(interaction, [], interaction.client, '/');
    case 'forward':
      if (forward.slashExecute) return forward.slashExecute(interaction, interaction.client);
      return forward.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'play':
      return play.autocomplete(interaction, interaction.client);
      default:
        break;
    }
  },
};
