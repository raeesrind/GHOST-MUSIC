const fs = require("fs");
const path = require("path");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "restart",
  category: "Owner",
  aliases: ["reboot"],
  description: "Restart the bot or manage modules (load/unload/reload)",
  args: false,
  usage: "[load|unload|reload <target>]",
  owner: true,

  slashOptions: [
    {
      name: "restart",
      description: "Restart the bot",
      type: 1,
    },
    {
      name: "load",
      description: "Load a command or category",
      type: 1,
      options: [{
        name: "target",
        description: "Command name or category to load",
        type: 3,
        required: true
      }]
    },
    {
      name: "unload",
      description: "Unload a command or category",
      type: 1,
      options: [{
        name: "target",
        description: "Command name or category to unload",
        type: 3,
        required: true
      }]
    },
    {
      name: "reload",
      description: "Reload a command or category",
      type: 1,
      options: [{
        name: "target",
        description: "Command name or category to reload",
        type: 3,
        required: true
      }]
    },
  ],

  async slashExecute(interaction, client) {
    if (!client.owners.includes(interaction.user.id)) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "restart") {
      return await this.handleRestart(interaction, client);
    }

    const target = interaction.options.getString("target");
    await this.handleModuleCommand(interaction, client, subcommand, target);
  },

  async execute(message, args, client) {
    if (!client.owners.includes(message.author.id)) return;

    const command = args[0]?.toLowerCase();

    if (!command || command === "restart") {
      return await this.handleRestart(message, client);
    }

    if (["load", "unload", "reload"].includes(command)) {
      const target = args.slice(1).join(" ");
      if (!target) {
        return message.reply({
          content: `**${client.emoji.warn} Please provide a target: \`${command} <command|category>\`**`
        });
      }
      return await this.handleModuleCommand(message, client, command, target);
    }

    return message.reply({
      content: `**${client.emoji.warn} Unknown subcommand. Use \`restart\`, \`load <target>\`, \`unload <target>\`, or \`reload <target>\`**`
    });
  },

  async handleRestart(msgOrInteraction, client) {
    const isInteraction = !!msgOrInteraction.applicationId;
    const author = msgOrInteraction.author || msgOrInteraction.user;

    const playingGuildsCount = [...client.manager.players.values()].filter(p => p.playing).length;
    const confirmMessage = playingGuildsCount === 0
      ? `**${client.emoji.warn} The bot is not playing anywhere.**\n**${client.emoji.info} Are you sure you want to restart?**`
      : `**${client.emoji.warn} The bot is currently active in \`${playingGuildsCount}\` servers.**\n**${client.emoji.info} Are you sure you want to restart?**`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("restart")
        .setEmoji(client.emoji.check)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setEmoji(client.emoji.cross)
        .setStyle(ButtonStyle.Secondary),
    );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(confirmMessage))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    let msg;
    if (isInteraction) {
      await msgOrInteraction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        withResponse: true
      });
      msg = await msgOrInteraction.fetchReply();
    } else {
      msg = await msgOrInteraction.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
      if (!msg) return;
    }

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === author.id,
      time: 30000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "restart") {
        await i.update({
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.load} Initializing Reboot Sequence...**`))
          ],
        });

        client.db.reboot.set(Date.now().toString(), {
          messageId: msg.id,
          channelId: (msgOrInteraction.channel?.id || msgOrInteraction.channelId),
          guildId: (msgOrInteraction.guild?.id || msgOrInteraction.guildId)
        });

        await client.cluster.respawnAll();
      } else {
        await i.update({
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.cross} Restart operation cancelled.**`))
          ]
        });
        collector.stop();
      }
    });
  },

  async handleModuleCommand(message, client, action, target) {
    const isInteraction = !!message.applicationId;

    const reply = async (title, body) => {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
        .addSeparatorComponents(new SeparatorBuilder());

      if (body) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
      }

      const payload = {
        components: [container],
        flags: MessageFlags.IsComponentsV2
      };

      if (isInteraction) {
        if (message.deferred || message.replied) return await message.editReply(payload).catch(() => { });
        return await message.reply(payload).catch(() => { });
      }
      return await message.reply(payload).catch(async () => {
        return await message.channel?.send(payload).catch(() => { });
      });
    };

    const commandsDir = path.join(process.cwd(), "src/commands");
    const categoryPath = path.join(commandsDir, target);
    let modules = [];
    let isBulk = false;

    const isDir = fs.existsSync(categoryPath) && fs.lstatSync(categoryPath).isDirectory();

    if (isDir) {
      isBulk = true;
      const files = fs.readdirSync(categoryPath);
      for (const file of files) {
        if (file.endsWith(".js")) {
          modules.push({
            name: file.replace(".js", ""),
            file: file,
            category: target,
            path: path.join(categoryPath, file)
          });
        }
      }
    } else {
      const cmd = client.commands.get(target) || client.commands.find(c => c.aliases?.includes(target));
      if (!cmd) {
        return await reply(
          `${client.emoji.cross} **Not Found**`,
          `${client.emoji.blank}${client.emoji.wickarrow} Could not find command or category \`${target}\`.`
        );
      }
      const catPath = path.join(commandsDir, cmd.category);
      const files = fs.readdirSync(catPath);
      const fileName = files.find(f => f.toLowerCase() === `${cmd.name.toLowerCase()}.js`) || `${cmd.name}.js`;
      modules.push({
        name: cmd.name,
        file: fileName,
        category: cmd.category,
        path: path.resolve(catPath, fileName)
      });
    }

    if (modules.length === 0) {
      return await reply(
        `${client.emoji.cross} **No Modules Found**`,
        `${client.emoji.blank}${client.emoji.wickarrow} No modules found for \`${target}\`.`
      );
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const mod of modules) {
      try {
        if (action === "load") {
          if (client.commands.has(mod.name)) {
            failCount++;
            errors.push(`\`${mod.name}\`: Already loaded`);
            continue;
          }
          const resolved = require.resolve(mod.path);
          delete require.cache[resolved];
          const command = require(resolved);
          client.commands.set(command.name, command);
          if (command.aliases) {
            const aliases = Array.isArray(command.aliases) ? command.aliases : [command.aliases];
            aliases.forEach(alias => client.aliases?.set(alias, command.name));
          }
          if (command.slashExecute || command.slashOptions) {
            const slashData = {
              name: command.name,
              description: command.description || "No description provided",
              options: command.slashOptions || [],
              category: command.category,
              execute: command.execute,
              slashExecute: command.slashExecute,
              autocomplete: command.autocomplete,
              run: command.run,
              player: command.player,
              inVoiceChannel: command.inVoiceChannel,
              sameVoiceChannel: command.sameVoiceChannel,
              botPerms: command.botPerms,
              userPerms: command.userPerms,
              owner: command.owner || false,
            };
            client.slashCommands.set(command.name, slashData);
          }
        } else if (action === "unload") {
          if (!client.commands.has(mod.name)) {
            failCount++;
            errors.push(`\`${mod.name}\`: Not loaded`);
            continue;
          }
          const cmd = client.commands.get(mod.name);
          if (client.aliases) {
            client.aliases.forEach((val, key) => {
              if (val === cmd.name) client.aliases.delete(key);
            });
          }
          client.commands.delete(mod.name);
          client.slashCommands.delete(mod.name);
          try {
            delete require.cache[require.resolve(mod.path)];
          } catch (e) { }
        } else if (action === "reload") {
          try {
            delete require.cache[require.resolve(mod.path)];
          } catch (e) { }
          const command = require(mod.path);
          if (client.aliases) {
            client.aliases.forEach((val, key) => {
              if (val === command.name) client.aliases.delete(key);
            });
            if (command.aliases) {
              const aliases = Array.isArray(command.aliases) ? command.aliases : [command.aliases];
              aliases.forEach(alias => client.aliases?.set(alias, command.name));
            }
          }
          client.slashCommands.delete(command.name);
          client.commands.set(command.name, command);
          if (command.slashExecute || command.slashOptions) {
            const slashData = {
              name: command.name,
              description: command.description || "No description provided",
              options: command.slashOptions || [],
              category: command.category,
              execute: command.execute,
              slashExecute: command.slashExecute,
              autocomplete: command.autocomplete,
              run: command.run,
              player: command.player,
              inVoiceChannel: command.inVoiceChannel,
              sameVoiceChannel: command.sameVoiceChannel,
              botPerms: command.botPerms,
              userPerms: command.userPerms,
              owner: command.owner || false,
            };
            client.slashCommands.set(command.name, slashData);
          }
        }
        successCount++;
      } catch (e) {
        failCount++;
        errors.push(`\`${mod.name}\`: ${e.message}`);
      }
    }

    const actionLabels = { load: "Loaded", unload: "Unloaded", reload: "Reloaded" };
    const actionName = actionLabels[action] || action;

    if (isBulk) {
      let msg = `${client.emoji.check} **Bulk ${actionName}** complete for \`${target}\`:\n${client.emoji.check} Success: ${successCount}\n`;
      if (failCount > 0) {
        msg += `${client.emoji.cross} Failed: ${failCount}\n`;
        errors.slice(0, 5).forEach(err => msg += `- ${err}\n`);
      }
      return await reply(msg);
    } else {
      const modName = modules[0].name;
      if (failCount === 0) {
        return await reply(`${client.emoji.check} **${actionName}** \`${modName}\` successfully.`);
      } else {
        return await reply(
          `${client.emoji.cross} **Error ${action}ing** \`${modName}\``,
          `\`\`\`js\n${errors[0]}\n\`\`\``
        );
      }
    }
  },
};
