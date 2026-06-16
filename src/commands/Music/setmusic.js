const { MessageFlags } = require("discord.js");

const volumeCmd = require("./volume");
const speedCmd = require("./speed");
const seekCmd = require("./seek");
const forwardCmd = require("./forward");
const rewindCmd = require("./rewind");
const autoplayCmd = require("./autoplay");
const sleepCmd = require("./sleep");
const moodCmd = require("./mood");
const artistradioCmd = require("./artistradio");
const similarCmd = require("./similar");
const moveCmd = require("./move");
const historyCmd = require("./history");
const forcefixCmd = require("./forcefix");
const leavecleanupCmd = require("./leavecleanup");
const forceskipCmd = require("./forceskip");

module.exports = {
  name: "setmusic",
  description: "Music settings and playback controls",
  category: "Music",
  groupSlash: true,

  slashOptions: [
    {
      name: "volume",
      description: "Change the music volume",
      type: 1,
      options: [
        {
          name: "amount",
          description: "Volume level (0-100)",
          type: 4,
          required: false
        }
      ]
    },
    {
      name: "speed",
      description: "Change playback speed",
      type: 1,
      options: [
        {
          name: "speed",
          description: "Playback speed (0.25 - 3.0)",
          type: 10,
          required: false
        }
      ]
    },
    {
      name: "seek",
      description: "Seek to a specific position in the current song",
      type: 1,
      options: [
        {
          name: "time",
          description: "Time to seek to (e.g. 40, 1:30, 10s, 1m)",
          type: 3,
          required: true
        }
      ]
    },
    {
      name: "forward",
      description: "Fast-forward the current song",
      type: 1,
      options: [
        {
          name: "seconds",
          description: "Seconds to fast-forward (default: 10)",
          type: 4,
          required: false
        }
      ]
    },
    {
      name: "rewind",
      description: "Rewind the current song",
      type: 1,
      options: [
        {
          name: "seconds",
          description: "Seconds to rewind (default: 10)",
          type: 4,
          required: false
        }
      ]
    },
    {
      name: "autoplay",
      description: "Control smart autoplay mode",
      type: 1,
      options: [
        {
          name: "mode",
          description: "Select autoplay mode",
          type: 3,
          required: false,
          choices: [
            { name: "OFF — No autoplay", value: "OFF" },
            { name: "SIMILAR — Closely matching tracks only", value: "SIMILAR" },
            { name: "DISCOVER — Explore outside comfort zone", value: "DISCOVER" },
            { name: "SMART — Full smart autoplay (default)", value: "SMART" }
          ]
        }
      ]
    },
    {
      name: "sleep",
      description: "Set a sleep timer for the music",
      type: 1,
      options: [
        {
          name: "duration",
          description: "Duration (e.g. 30m, 1h) or 'cancel' to stop",
          type: 3,
          required: true
        }
      ]
    },
    {
      name: "mood",
      description: "Play music based on your mood or genre",
      type: 1
    },
    {
      name: "similar",
      description: "Get songs similar to the currently playing track",
      type: 1
    },
    {
      name: "move",
      description: "Move a track to a different position in the queue",
      type: 1
    },
    {
      name: "history",
      description: "View recently played tracks",
      type: 1
    },
    {
      name: "forcefix",
      description: "Fix voice connection issues",
      type: 1
    },
    {
      name: "artistradio",
      description: "Start a radio based on similar artists",
      type: 1,
      options: [
        {
          name: "artist",
          description: "The artist to base the radio on",
          type: 3,
          required: true
        }
      ]
    },
    {
      name: "leavecleanup",
      description: "Clean up empty voice channels",
      type: 1
    },
    {
      name: "forceskip",
      description: "Force skip the current song (bypasses vote)",
      type: 1
    }
  ],

  async slashExecute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const prefix = client.prefix;

    const wrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (opts) => {
        if (interaction.deferred) return interaction.editReply(opts);
        if (interaction.replied) return interaction.followUp(opts);
        return interaction.reply(opts);
      },
    };

    switch (sub) {
      case "volume": return volumeCmd.slashExecute(interaction, client);
      case "speed": return speedCmd.slashExecute(interaction, client);
      case "seek": return seekCmd.slashExecute(interaction, client);
      case "forward": return forwardCmd.slashExecute(interaction, client);
      case "rewind": return rewindCmd.slashExecute(interaction, client);
      case "autoplay": return autoplayCmd.slashExecute(interaction, client);
      case "sleep": return sleepCmd.slashExecute(interaction, client);
      case "mood": return moodCmd.execute(wrapper, [], client, prefix);
      case "similar": return similarCmd.slashExecute(interaction, client);
      case "move": return moveCmd.slashExecute(interaction, client);
      case "history": return historyCmd.slashExecute(interaction, client);
      case "forcefix": return forcefixCmd.slashExecute(interaction, client);
      case "artistradio": return artistradioCmd.slashExecute(interaction, client);
      case "leavecleanup": return leavecleanupCmd.slashExecute(interaction, client);
      case "forceskip": return forceskipCmd.slashExecute(interaction, client);
      default:
        return interaction.reply({
          content: `Unknown subcommand: ${sub}`,
          flags: MessageFlags.Ephemeral
        });
    }
  }
};
