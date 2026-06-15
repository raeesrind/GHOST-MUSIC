const { MessageFlags } = require("discord.js");

const playCmd = require("./play");
const searchCmd = require("./search");
const skipCmd = require("./skip");
const skiptoCmd = require("./skipto");
const stopCmd = require("./stop");
const pauseCmd = require("./pause");
const resumeCmd = require("./resume");
const nowplayingCmd = require("./nowplaying");
const queueCmd = require("./queue");
const clearqueueCmd = require("./clearqueue");
const shuffleCmd = require("./shuffle");
const previousCmd = require("./previous");
const replayCmd = require("./replay");
const joinCmd = require("./join");
const leaveCmd = require("./leave");
const grabCmd = require("./grab");
const loopCmd = require("./loop");
const removeCmd = require("./remove");

module.exports = {
  name: "music",
  description: "Music player commands",
  category: "Music",
  groupSlash: true,

  slashOptions: [
    {
      name: "play",
      description: "Play a song or playlist",
      type: 1,
      options: [
        {
          name: "song",
          description: "Song name or URL to play",
          type: 3,
          required: true,
          autocomplete: true
        }
      ]
    },
    {
      name: "search",
      description: "Search for songs and artists",
      type: 1,
      options: [
        {
          name: "song",
          description: "The song you want to search for",
          type: 3,
          required: true
        }
      ]
    },
    {
      name: "skip",
      description: "Skip the current song",
      type: 1
    },
    {
      name: "skipto",
      description: "Skip to a specific position in the queue",
      type: 1,
      options: [
        {
          name: "position",
          description: "Position in queue to skip to",
          type: 4,
          required: true
        }
      ]
    },
    {
      name: "stop",
      description: "Stop the music and clear the queue",
      type: 1
    },
    {
      name: "pause",
      description: "Pause the current song",
      type: 1
    },
    {
      name: "resume",
      description: "Resume the paused song",
      type: 1
    },
    {
      name: "nowplaying",
      description: "Show the currently playing song",
      type: 1
    },
    {
      name: "queue",
      description: "Show the current music queue",
      type: 1
    },
    {
      name: "clearqueue",
      description: "Clear all songs from the queue",
      type: 1
    },
    {
      name: "shuffle",
      description: "Shuffle the current queue",
      type: 1
    },
    {
      name: "previous",
      description: "Go back to the previous song",
      type: 1
    },
    {
      name: "replay",
      description: "Replay the current song from the beginning",
      type: 1
    },
    {
      name: "join",
      description: "Join your voice channel",
      type: 1
    },
    {
      name: "leave",
      description: "Leave the voice channel",
      type: 1
    },
    {
      name: "grab",
      description: "Save the current song to your DMs",
      type: 1
    },
    {
      name: "loop",
      description: "Configure music loop mode",
      type: 1,
      options: [
        {
          name: "mode",
          description: "Loop mode (omit to see current status)",
          type: 3,
          required: false,
          choices: [
            { name: "Off", value: "off" },
            { name: "Track", value: "track" },
            { name: "Queue", value: "queue" }
          ]
        }
      ]
    },
    {
      name: "remove",
      description: "Remove tracks from the queue",
      type: 1
    }
  ],

  autocomplete: async (interaction, client) => {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "play") return playCmd.autocomplete(interaction, client);
  },

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
      case "play": return playCmd.slashExecute(interaction, client);
      case "search": return searchCmd.slashExecute(interaction, client);
      case "skip": return skipCmd.slashExecute(interaction, client);
      case "skipto": return skiptoCmd.slashExecute(interaction, client);
      case "stop": return stopCmd.slashExecute(interaction, client);
      case "pause": return pauseCmd.slashExecute(interaction, client);
      case "resume": return resumeCmd.slashExecute(interaction, client);
      case "nowplaying": return nowplayingCmd.slashExecute(interaction, client);
      case "queue": return queueCmd.slashExecute(interaction, client);
      case "clearqueue": return clearqueueCmd.slashExecute(interaction, client);
      case "shuffle": return shuffleCmd.slashExecute(interaction, client);
      case "previous": return previousCmd.slashExecute(interaction, client);
      case "replay": return replayCmd.slashExecute(interaction, client);
      case "join": return joinCmd.slashExecute(interaction, client);
      case "leave": return leaveCmd.slashExecute(interaction, client);
      case "grab": return grabCmd.slashExecute(interaction, client);
      case "loop": {
        const mode = interaction.options.getString("mode");
        let lArgs;
        if (!mode) lArgs = [];
        else if (mode === "off") lArgs = ["disable"];
        else lArgs = ["enable", mode];
        return loopCmd.execute(wrapper, lArgs, client, prefix);
      }
      case "remove": return removeCmd.slashExecute(interaction, client);
      default:
        return interaction.reply({
          content: `Unknown subcommand: ${sub}`,
          flags: MessageFlags.Ephemeral
        });
    }
  }
};
