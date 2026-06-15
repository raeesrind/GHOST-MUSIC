const { MessageFlags } = require("discord.js");

const pingCmd = require("./ping");
const statsCmd = require("./stats");
const inviteCmd = require("./invite");
const supportCmd = require("./support");
const profileCmd = require("./profile");
const helpCmd = require("./help");
const bioCmd = require("./bio");
const uptimeCmd = require("./uptime");
const usersCmd = require("./users");

function makeWrapper(interaction) {
  return {
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
}

module.exports = {
  name: "info",
  description: "Bot information and utility commands",
  category: "Information",
  groupSlash: true,

  slashOptions: [
    {
      name: "ping",
      description: "Display the bot's latencies",
      type: 1
    },
    {
      name: "stats",
      description: "Show detailed bot statistics",
      type: 1
    },
    {
      name: "invite",
      description: "Get the bot's invite link",
      type: 1
    },
    {
      name: "support",
      description: "Get the support server invite link",
      type: 1
    },
    {
      name: "profile",
      description: "Display your custom bot profile image",
      type: 1,
      options: [
        {
          name: "user",
          description: "The user whose profile you want to see",
          type: 6,
          required: false
        }
      ]
    },
    {
      name: "help",
      description: "Show all commands or info about a specific command",
      type: 1,
      options: [
        {
          name: "command",
          description: "Get help for a specific command",
          type: 3,
          required: false,
          autocomplete: true
        }
      ]
    },
    {
      name: "bio",
      description: "Set or manage your profile bio",
      type: 1,
      options: [
        {
          name: "text",
          description: "New bio text (omit to clear)",
          type: 3,
          required: false
        }
      ]
    },
    {
      name: "uptime",
      description: "Show the bot's uptime",
      type: 1
    },
    {
      name: "users",
      description: "Show the bot's total users and servers",
      type: 1
    }
  ],

  autocomplete: async (interaction, client) => {
    const sub = interaction.options.getSubcommand();
    if (sub === "help") return helpCmd.autocomplete(interaction, client);
  },

  async slashExecute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const prefix = client.prefix;
    const wrapper = makeWrapper(interaction);

    switch (sub) {
      case "ping": return pingCmd.slashExecute(interaction, client);
      case "stats": return statsCmd.slashExecute(interaction, client);
      case "invite": return inviteCmd.slashExecute(interaction, client);
      case "support": return supportCmd.slashExecute(interaction, client);
      case "profile": return profileCmd.slashExecute(interaction, client);
      case "help": return helpCmd.slashExecute(interaction, client);
      case "bio": {
        const text = interaction.options.getString("text");
        if (text) return bioCmd.execute(wrapper, ["set", text], client);
        return bioCmd.execute(wrapper, [], client);
      }
      case "uptime": return uptimeCmd.execute(wrapper, [], client);
      case "users": return usersCmd.execute(wrapper, [], client);
      default:
        return interaction.reply({
          content: `Unknown subcommand: ${sub}`,
          flags: MessageFlags.Ephemeral
        });
    }
  }
};
