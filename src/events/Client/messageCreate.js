const {
  PermissionsBitField,
  WebhookClient,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");
const buildChecker = require("../../utils/checkNoPrefixAccess");
const cooldowns = new Map();

module.exports = {
  name: "messageCreate",
  once: false,
  run: async (client, message) => {
    try {
      // TEMP: remove after top.gg testing
      const TESTER_BOT_ID = "1513558253680721920";
      if (message.author.bot && message.author.id !== TESTER_BOT_ID) return;
      if (!message.guild) return;

      try {
        if (client.automod) client.automod.handleMessage(message);
      } catch (err) {
        console.error(`[AutoMod Error] ${err.message}`);
      }

      // Fetch guild prefix from DB
      let prefix = client.prefix;
      try {
        const prefixData = client.db.prefixes.get(message.guild.id);
        if (prefixData?.prefix) prefix = prefixData.prefix;
      } catch (err) {
        console.error(`[DB Error] prefixes.get:`, err);
      }

      // Mention reply
      const mention = new RegExp(`^<@!?${client.user.id}>( |)$`);
      if (message.content.match(mention)) {
        const perms = message.channel.permissionsFor(client.user);
        if (perms && perms.has(PermissionsBitField.Flags.SendMessages) && perms.has(PermissionsBitField.Flags.EmbedLinks)) {
          const greetDisplay = new TextDisplayBuilder()
            .setContent(
              `**${client.emoji.check} Hey ${message.author}!**\n` +
              `**${client.emoji.info} My prefix for this server is  **\`${prefix}\`\n\n` +
              `**${client.emoji.info} Type \`${prefix}help\` for a list of commands.**`
            );
          const container = new ContainerBuilder().addTextDisplayComponents(greetDisplay);
          await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
        }
        return;
      }

      // Ignored channel check
      try {
        const isIgnored = client.db.ignorechannels.get(message.guild.id, message.channel.id);
        if (isIgnored) return;
      } catch (err) {
        console.error(`[DB Error] ignorechannels.get:`, err);
      }

      // Determine prefix
      let hasNoPrefix;
      try {
        hasNoPrefix = client.db.noprefix.getGlobal(message.author.id);
      } catch (err) {
        console.error(`[DB Error] noprefix.getGlobal:`, err);
      }

      let hasNewNoPrefix = false;
      try {
        const checker = buildChecker(client.db, client.config);
        hasNewNoPrefix = checker.hasNoPrefixAccess(message.author.id, message.guild.id);
      } catch (err) {
        console.error(`[DB Error] checkNoPrefixAccess:`, err);
      }

      let usedPrefix = '';
      if (message.content.startsWith(prefix)) {
        usedPrefix = prefix;
      } else if (message.content.match(new RegExp(`^<@!?${client.user.id}>`))) {
        usedPrefix = message.content.match(new RegExp(`^<@!?${client.user.id}>`))[0];
      } else if (!hasNoPrefix && !hasNewNoPrefix) {
        return;
      }

      if (!usedPrefix && !hasNoPrefix && !hasNewNoPrefix) return;

      const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();
      if (!commandName) return;

      // Lookup command by name or alias
      let command = client.commands.get(commandName);
      if (!command) {
        command = client.commands.find(cmd => {
          if (!cmd || !cmd.aliases) return false;
          return Array.isArray(cmd.aliases) ? cmd.aliases.includes(commandName) : cmd.aliases === commandName;
        });
      }

      if (!command) {
        console.log(`[MSG] No command for "${commandName}" (prefix "${usedPrefix}")`);
        return;
      }

      console.log(`[MSG] Executing "${command.name}" for "${commandName}" (user: ${message.author.id})`);

      // Owner guard
      if (command.owner && !client.config.ownerID.includes(message.author.id)) {
        console.log(`[MSG] Owner command "${command.name}" blocked for ${message.author.id}`);
        return;
      }

      // Invites guard
      if (usedPrefix.length === 0 && commandName === 'i' && command.name === 'invites') {
        if (args.length > 1 || (args.length === 1 && !/^(<@!?\d+>|\d+)$/.test(args[0]))) return;
      }

      // Blacklist
      try {
        const isBlacklisted = client.db.blacklist.get(message.author.id);
        if (isBlacklisted) {
          const blacklistDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.warn} You have been blacklisted from using the bot!**`);
          const container = new ContainerBuilder().addTextDisplayComponents(blacklistDisplay);
          const reply = await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
          if (reply) setTimeout(() => reply.delete().catch(() => { }), 5000);
          return;
        }
      } catch (err) {
        console.error(`[DB Error] blacklist.get:`, err);
      }

      // Cooldown
      if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Map());
      const now = Date.now();
      const timestamps = cooldowns.get(command.name);
      const cooldownAmount = (command.cooldown || 3) * 1000;
      if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
        if (now < expirationTime) {
          const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
          const cooldownDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.warn} Please wait ${timeLeft}s before using \`${command.name}\` command again.**`);
          const container = new ContainerBuilder().addTextDisplayComponents(cooldownDisplay);
          return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).then((msg) => {
            setTimeout(() => msg.delete().catch(() => { }), expirationTime - now);
          });
        }
      }
      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

      // Permission checks
      const perms = message.channel.permissionsFor(client.user);
      if (!perms || !perms.has(PermissionsBitField.Flags.SendMessages)) {
        return await message.author.send({
          components: [new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${client.emoji.cross} I can't send messages in ${message.channel} to execute \`${command.name}\`.**`)
          )],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
      }

      if (!perms.has(PermissionsBitField.Flags.EmbedLinks)) {
        return await message.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${client.emoji.cross} I need \`EMBED_LINKS\` permission in this channel.**`)
          )],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
      }

      if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;
        if (command.usage) reply += `\nUsage: \`${prefix}${command.name} ${command.usage}\``;
        return message.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(reply))],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
      }

      if (command.botPerms && !message.guild.members.me.permissions.has(PermissionsBitField.resolve(command.botPerms || []))) {
        return message.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`I need \`${command.botPerms.join(', ')}\` permission.`)
          )],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
      }

      if (command.userPerms && !client.config.ownerID.includes(message.author.id) && !message.member.permissions.has(PermissionsBitField.resolve(command.userPerms || []))) {
        return message.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`You need \`${command.userPerms.join(', ')}\` permission.`)
          )],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
      }

      // Rank / Owner check
      const { checkBotRank } = require("../../utils/permissionCheck");
      if (command.rank) {
        const hasRank = await checkBotRank(message.author.id, command.rank, client, command.name);
        if (!hasRank) return;
      } else if (command.owner && !client.config.ownerID.includes(message.author.id)) {
        return;
      }

      if (command.category === 'Music' && message.member.voice?.channel) {
        const userVcId = message.member.voice.channel.id;
        const mainPlayer = client.manager?.players?.get(message.guild.id);
        const mainBotInVc = mainPlayer && mainPlayer.voiceId === userVcId;

        if (!mainBotInVc && mainPlayer) {
          const launcherPort = client.launcherPort || 48901;
          const http = require('http');
          const postData = JSON.stringify({
            guildId: message.guild.id,
            channelId: userVcId,
            textChannelId: message.channel.id,
            commandName: command.name,
            cmdArgs: args,
            prefix: prefix,
            userId: message.author.id,
          });

          try {
            const result = await new Promise((resolve, reject) => {
              const req = http.request({
                hostname: '127.0.0.1',
                port: launcherPort,
                path: '/route',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
                timeout: 5000,
              }, (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                  try { resolve(JSON.parse(body)); } catch { resolve(null); }
                });
              });
              req.on('error', () => resolve(null));
              req.write(postData);
              req.end();
            });

            if (result?.queued) {
              return message.channel.send({
                components: [new ContainerBuilder().addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`**⏳ All bots are busy. You are #${result.position} in queue.**`)
                )],
                flags: MessageFlags.IsComponentsV2
              });
            }

            if (result?.success) return;
          } catch {}
        }
      }

      const player = client.manager?.players?.get(message.guild.id);
      if (command.player && !player) {
        return message.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${client.emoji.warn} No music player active.**`)
          )],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
      }

      if (command.inVoiceChannel && !message.member.voice.channel) {
        return message.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${client.emoji.warn} You must be in a voice channel.**`)
          )],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
      }

      if (command.sameVoiceChannel && player && message.member.voice.channel.id !== player.voiceId) {
        return message.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${client.emoji.warn} You must be in the same voice channel.**`)
          )],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
      }

      // Execute
      try {
        await command.execute(message, args, client, prefix);

        if (client.config.Webhooks?.cmdrun) {
          const web = new WebhookClient({ url: client.config.Webhooks.cmdrun });
          const commandlog = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setColor(client.color)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setDescription(
              `**${client.emoji.dot} Command Used In:** \`${message.guild.name} | ${message.guild.id}\`\n` +
              `**${client.emoji.dot} Channel:** \`${message.channel.name} | ${message.channel.id}\`\n` +
              `**${client.emoji.dot} Command:** \`${command.name}\`\n` +
              `**${client.emoji.dot} Executor:** \`${message.author.tag} | ${message.author.id}\`\n` +
              `**${client.emoji.dot} Content:** \`${message.content}\``
            );
          web.send({ embeds: [commandlog] }).catch(console.error);
        }
      } catch (error) {
        console.error(`Error executing command ${command.name}:`, error);
        try {
          if (perms && perms.has(PermissionsBitField.Flags.SendMessages)) {
            await message.channel.send({
              components: [new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**${client.emoji.warn} An error occurred executing that command.**`)
              )],
              flags: MessageFlags.IsComponentsV2
            });
          }
        } catch (sendError) {
          if (sendError.code !== 50013) console.error(`Failed to send error:`, sendError);
        }
      }
    } catch (err) {
      console.error(`[messageCreate] UNCAUGHT ERROR:`, err);
    }
  },
};
