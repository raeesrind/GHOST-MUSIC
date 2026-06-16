const { SlashCommandBuilder } = require('discord.js');

const rewind = require('../Music/rewind.js');
const replay = require('../Music/replay.js');
const search = require('../Music/search.js');
const autoplay = require('../Music/autoplay.js');
const lyrics = require('../Music/lyrics.js');
const grab = require('../Music/grab.js');
const history = require('../Music/history.js');
const artistradio = require('../Music/artistradio.js');
const similar = require('../Music/similar.js');
const sleep = require('../Music/sleep.js');
const speed = require('../Music/speed.js');
const leavecleanup = require('../Music/leavecleanup.js');
const forcefix = require('../Music/forcefix.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('player-2')
    .setDescription('More music playback commands')
    .addSubcommand(sub =>
      sub
        .setName('rewind')
        .setDescription('Rewind the current song by specified seconds')
          .addIntegerOption(opt =>
            opt
              .setName('seconds')
              .setDescription('Number of seconds to rewind (default: 10)')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('replay')
        .setDescription('Replay the current song from the beginning')
    )
    .addSubcommand(sub =>
      sub
        .setName('search')
        .setDescription('Search for songs and artists and add them to queue')
          .addStringOption(opt =>
            opt
              .setName('song')
              .setDescription('The song you want to search for')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('autoplay')
        .setDescription('Control smart autoplay mode')
        .addStringOption(opt =>
          opt
            .setName('mode')
            .setDescription('Select autoplay mode')
            .setRequired(false)
            .addChoices(
              { name: 'OFF — No autoplay', value: 'OFF' },
              { name: 'SIMILAR — Closely matching tracks only', value: 'SIMILAR' },
              { name: 'DISCOVER — Explore outside comfort zone', value: 'DISCOVER' },
              { name: 'SMART — Full smart autoplay (default)', value: 'SMART' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lyrics')
        .setDescription('Display lyrics for the currently playing song')
    )
    .addSubcommand(sub =>
      sub
        .setName('grab')
        .setDescription('Grabs and sends you the song that is currently playing.')
    )
    .addSubcommand(sub =>
      sub
        .setName('history')
        .setDescription('Show the history of recently played songs')
    )
    .addSubcommand(sub =>
      sub
        .setName('artistradio')
        .setDescription('Starts a radio based on similar artists from Last.fm')
          .addStringOption(opt =>
            opt
              .setName('artist')
              .setDescription('The artist to base the radio on')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('similar')
        .setDescription('Get songs similar to currently playing track')
    )
    .addSubcommand(sub =>
      sub
        .setName('sleep')
        .setDescription('Set a sleep timer to stop music after a duration')
          .addStringOption(opt =>
            opt
              .setName('duration')
              .setDescription('Duration for the sleep timer (e.g. 30m, 1h) or \'cancel\' to stop it')
             .setRequired(true)
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('speed')
        .setDescription('Change the playback speed of the current song')
          .addNumberOption(opt =>
            opt
              .setName('speed')
              .setDescription('Playback speed (0.25 - 3.0)')
          )
    )
    .addSubcommand(sub =>
      sub
        .setName('leavecleanup')
        .setDescription('Removes absent user\'s songs from the queue')
    )
    .addSubcommand(sub =>
      sub
        .setName('forcefix')
        .setDescription('Force fix music bot issues (not playing/not joining VC)')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
    case 'rewind':
      if (rewind.slashExecute) return rewind.slashExecute(interaction, interaction.client);
      return rewind.execute(interaction, [], interaction.client, '/');
    case 'replay':
      if (replay.slashExecute) return replay.slashExecute(interaction, interaction.client);
      return replay.execute(interaction, [], interaction.client, '/');
    case 'search':
      if (search.slashExecute) return search.slashExecute(interaction, interaction.client);
      return search.execute(interaction, [], interaction.client, '/');
    case 'autoplay': {
      const args = [];
      const mode = interaction.options.getString('mode');
      if (mode) args.push(mode);
      if (autoplay.slashExecute) return autoplay.slashExecute(interaction, interaction.client);
      return autoplay.execute(interaction, args, interaction.client, '/');
    }
    case 'lyrics':
      if (lyrics.slashExecute) return lyrics.slashExecute(interaction, interaction.client);
      return lyrics.execute(interaction, [], interaction.client, '/');
    case 'grab':
      if (grab.slashExecute) return grab.slashExecute(interaction, interaction.client);
      return grab.execute(interaction, [], interaction.client, '/');
    case 'history':
      if (history.slashExecute) return history.slashExecute(interaction, interaction.client);
      return history.execute(interaction, [], interaction.client, '/');
    case 'artistradio':
      if (artistradio.slashExecute) return artistradio.slashExecute(interaction, interaction.client);
      return artistradio.execute(interaction, [], interaction.client, '/');
    case 'similar':
      if (similar.slashExecute) return similar.slashExecute(interaction, interaction.client);
      return similar.execute(interaction, [], interaction.client, '/');
    case 'sleep':
      if (sleep.slashExecute) return sleep.slashExecute(interaction, interaction.client);
      return sleep.execute(interaction, [], interaction.client, '/');
    case 'speed':
      if (speed.slashExecute) return speed.slashExecute(interaction, interaction.client);
      return speed.execute(interaction, [], interaction.client, '/');
    case 'leavecleanup':
      if (leavecleanup.slashExecute) return leavecleanup.slashExecute(interaction, interaction.client);
      return leavecleanup.execute(interaction, [], interaction.client, '/');
    case 'forcefix':
      if (forcefix.slashExecute) return forcefix.slashExecute(interaction, interaction.client);
      return forcefix.execute(interaction, [], interaction.client, '/');
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
