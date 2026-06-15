const { MessageFlags } = require("discord.js");

const cmd247 = require("./247");
const ignoreCmd = require("./ignore");
const setprefixCmd = require("./setprefix");
const sourceCmd = require("./source");

module.exports = {
  name: "config",
  description: "Server configuration commands",
  category: "Config",
  groupSlash: true,

  slashOptions: [
    {
      name: "247",
      description: "Enable or disable 24/7 mode",
      type: 1,
      options: [
        {
          name: "action",
          description: "Enable or disable 24/7 mode",
          type: 3,
          required: true,
          choices: [
            { name: "Enable", value: "enable" },
            { name: "Disable", value: "disable" }
          ]
        }
      ]
    },
    {
      name: "ignore",
      description: "Manage ignored channels",
      type: 1,
      options: [
        {
          name: "action",
          description: "Action to perform",
          type: 3,
          required: true,
          choices: [
            { name: "add", value: "add" },
            { name: "remove", value: "remove" },
            { name: "list", value: "list" },
            { name: "reset", value: "reset" }
          ]
        },
        {
          name: "channel",
          description: "Channel to add or remove from ignore list",
          type: 7,
          required: false
        }
      ]
    },
    {
      name: "setprefix",
      description: "Set a new command prefix (max 3 characters)",
      type: 1,
      options: [
        {
          name: "prefix",
          description: "New prefix (max 3 characters)",
          type: 3,
          required: true
        }
      ]
    },
    {
      name: "source",
      description: "Set your preferred music source",
      type: 1,
      options: [
        {
          name: "source",
          description: "Choose your preferred music source",
          type: 3,
          required: true,
          choices: [
            { name: "YouTube Music", value: "ytmsearch" },
            { name: "YouTube", value: "ytsearch" },
            { name: "Spotify", value: "spsearch" },
            { name: "Apple Music", value: "amsearch" },
            { name: "Deezer", value: "dzsearch" },
            { name: "JioSaavn", value: "jssearch" },
            { name: "Gaana", value: "gnsearch" },
            { name: "SoundCloud", value: "scsearch" }
          ]
        }
      ]
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
      case "247":
        return cmd247.slashExecute(interaction, client);

      case "ignore": {
        const action = interaction.options.getString("action");
        const channel = interaction.options.getChannel("channel");
        const iArgs = [action];
        if (channel) iArgs.push(channel.id);
        return ignoreCmd.execute(wrapper, iArgs, client, prefix);
      }

      case "setprefix": {
        const newPrefix = interaction.options.getString("prefix");
        return setprefixCmd.execute(wrapper, [newPrefix], client, prefix);
      }

      case "source":
        return sourceCmd.slashExecute(interaction, client);

      default:
        return interaction.reply({
          content: `Unknown subcommand: ${sub}`,
          flags: MessageFlags.Ephemeral
        });
    }
  }
};
