require('dotenv').config();
const path = require('path');
const fs = require('fs');
const {
  Client, GatewayIntentBits, Collection, ContainerBuilder,
  TextDisplayBuilder, MessageFlags
} = require('discord.js');
const { Kazagumo, KazagumoTrack } = require('kazagumo');
const { Connectors } = require('shoukaku');
const Spotify = require('kazagumo-spotify');

const botId = parseInt(process.env.GHOST_BOT_ID);
if (!botId || botId < 1 || botId > 3) {
  console.error('[SubBot] Invalid GHOST_BOT_ID. Must be 1, 2, or 3.');
  process.exit(1);
}

const rootConfig = require('./config.json');
const botConfig = rootConfig.subBots.find(b => b.id === botId);
if (!botConfig || !botConfig.token) {
  console.error(`[SubBot] Missing token for Ghost-${botId}.`);
  process.exit(1);
}

const mainConfig = require('./src/config.json');

const client = new Client({
  intents:
    GatewayIntentBits.Guilds |
    GatewayIntentBits.GuildVoiceStates |
    GatewayIntentBits.GuildMessages |
    GatewayIntentBits.MessageContent,
  allowedMentions: { parse: [], repliedUser: false },
  rest: { timeout: 60000 },
});

client.commands = new Collection();
client.aliases = new Collection();
client.emoji = require('./src/emojis');
client.color = mainConfig.color || '#00D4FF';
client.embedColor = client.color;
client.prefix = mainConfig.prefix || '.';
client.config = mainConfig;
client.db = require('./src/structures/Database');
client.logger = {
  log: (msg, tag) => console.log(`[${botConfig.name}] [${tag || 'info'}] ${msg}`),
};

let leaveTimer = null;

function loadMusicCommands() {
  const commandsPath = path.join(__dirname, 'src', 'commands', 'Music');
  if (!fs.existsSync(commandsPath)) {
    console.error(`[${botConfig.name}] Music commands dir not found at ${commandsPath}`);
    return;
  }
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const cmd = require(path.join(commandsPath, file));
      if (!cmd || !cmd.name || cmd.category !== 'Music') continue;
      client.commands.set(cmd.name.toLowerCase(), cmd);
      if (Array.isArray(cmd.aliases)) {
        for (const alias of cmd.aliases) {
          if (!client.commands.has(alias.toLowerCase())) {
            client.commands.set(alias.toLowerCase(), cmd);
          }
          client.aliases.set(alias.toLowerCase(), cmd.name.toLowerCase());
        }
      }
    } catch (err) {
      console.error(`[${botConfig.name}] Failed to load ${file}: ${err.message}`);
    }
  }
  console.log(`[${botConfig.name}] Loaded ${client.commands.size} music command entries`);
}

function setupKazagumo() {
  const manager = new Kazagumo(
    {
      defaultSearchEngine: mainConfig.node_source || 'ytmsearch',
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
      plugins: [
        new Spotify({
          clientId: process.env.SPOTIFY_CLIENT_ID,
          clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
          playlistPageLimit: 1,
          albumPageLimit: 1,
          searchLimit: 10,
          searchMarket: 'US',
        }),
      ],
    },
    new Connectors.DiscordJS(client),
    mainConfig.nodes,
    mainConfig.node_options
  );

  manager.on('nodeConnect', (node) => console.log(`[${botConfig.name}] Lavalink node "${node.name}" connected.`));
  manager.on('nodeError', (node, error) => console.log(`[${botConfig.name}] Lavalink node error: ${error.message}`));
  manager.on('nodeDisconnect', (node, reason) => console.log(`[${botConfig.name}] Lavalink node disconnected: ${reason || 'Unknown'}`));

  manager.on('playerCreate', (player) => {
    console.log(`[${botConfig.name}] Player created in guild ${player.guildId}`);
    if (player.voiceId) {
      client.rest.put(`/channels/${player.voiceId}/voice-status`, {
        body: { status: `use **${client.prefix}play** to add songs` },
      }).catch(() => null);
    }
  });

  manager.on('playerStart', (player, track) => {
    clearLeaveTimer();
    const channel = client.channels.cache.get(player.textId);
    if (!channel) return;
    const display = new TextDisplayBuilder()
      .setContent(`**${client.emoji.music || '🎵'} Now Playing: [${track.title}](${track.uri})**`);
    const container = new ContainerBuilder().addTextDisplayComponents(display);
    channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
  });

  manager.on('playerEmpty', (player) => {
    if (player.voiceId) {
      client.rest.put(`/channels/${player.voiceId}/voice-status`, {
        body: { status: `use **${client.prefix}play** to add songs` },
      }).catch(() => null);
    }
    startLeaveTimer(player);
  });

  manager.on('playerDestroy', (player) => {
    clearLeaveTimer();
    if (player.voiceId) {
      client.rest.put(`/channels/${player.voiceId}/voice-status`, {
        body: { status: '' },
      }).catch(() => null);
    }
    notifyMainBotFree(player.guildId);
  });

  manager.on('error', (error) => {
    if (error.message?.includes('Connection exist but player not found')) return;
    console.error(`[${botConfig.name}] Kazagumo error:`, error.message);
  });

  manager.shoukaku.on('ready', (name) => console.log(`[${botConfig.name}] Lavalink "${name}" ready.`));
  manager.shoukaku.on('error', (name, error) => console.log(`[${botConfig.name}] Lavalink "${name}" error: ${error}`));
  manager.shoukaku.on('close', (name, code, reason) => console.log(`[${botConfig.name}] Lavalink "${name}" closed (${code}): ${reason}`));

  client.manager = manager;
}

function clearLeaveTimer() {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
}

function startLeaveTimer(player) {
  clearLeaveTimer();
  leaveTimer = setTimeout(async () => {
    const currentPlayer = client.manager?.players?.get(player.guildId);
    if (!currentPlayer || currentPlayer.state === 'DESTROYED') return;
    if (currentPlayer.playing || currentPlayer.paused) return;

    const channel = client.channels.cache.get(player.textId);
    if (channel) {
      const display = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info || 'ℹ️'} Left voice channel due to inactivity.**`);
      const container = new ContainerBuilder().addTextDisplayComponents(display);
      channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
    }

    await currentPlayer.destroy().catch(() => null);
    clearLeaveTimer();
    notifyMainBotFree(player.guildId);
  }, 180000);
}

function notifyMainBotFree(guildId) {
  if (typeof process.send === 'function') {
    process.send({ type: 'BOT_FREE', guildId });
  }
}

function isBusyInGuild(guildId) {
  return client.manager?.shoukaku?.connections?.has(guildId) === true;
}

function getGuildConnection(guildId) {
  return client.manager?.shoukaku?.connections?.get(guildId) || null;
}

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.id !== client.user.id) return;

  if (oldState.channelId && !newState.channelId) {
    client.logger.log(`Disconnected from voice channel.`, 'info');
    const player = client.manager?.players?.get(oldState.guild.id);
    if (player) {
      await player.destroy().catch(() => {});
    }
    clearLeaveTimer();
    notifyMainBotFree(oldState.guild.id);
  }

  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    client.logger.log(`Moved to voice channel: ${newState.channelId}`, 'info');
    const player = client.manager?.players?.get(oldState.guild.id);
    if (player) {
      player.setVoiceChannel(newState.channelId);
    }
  }
});

if (typeof process.send === 'function') {
  process.on('message', async (msg) => {
    if (msg.type === 'STATUS_REQUEST') {
      const busy = isBusyInGuild(msg.guildId);
      if (typeof process.send === 'function') {
        process.send({ type: 'STATUS_REPLY', requestId: msg.requestId, botId, busy });
      }
      return;
    }

    if (msg.type === 'HANDLE_COMMAND') {
      const { guildId, channelId, textChannelId, commandName, cmdArgs, prefix, userId } = msg;

      if (isBusyInGuild(guildId) && !client.manager?.players?.get(guildId)) return;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(textChannelId);
      if (!channel) return;

      const member = userId
        ? guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null)
        : null;

      if (!member?.voice?.channel || member.voice.channel.id !== channelId) return;

      const messageWrapper = {
        guild,
        channel,
        author: member?.user || client.user,
        member: member || guild.members.me,
        reply: async (options) => {
          if (typeof options === 'string') return channel.send(options);
          return channel.send(options);
        },
        channelId: textChannelId,
        guildId: guildId,
      };

      if (!commandName || commandName === 'play' || commandName === 'p') {
        if (!client.manager?.players?.get(guildId)) {
          try {
            await client.manager.createPlayer({
              guildId,
              voiceId: channelId,
              textId: textChannelId,
              volume: 100,
              deaf: true,
              mute: false,
            });
          } catch (err) {
            console.error(`[${botConfig.name}] Failed to create player:`, err.message);
            return;
          }
        }

        if ((commandName === 'play' || commandName === 'p') && cmdArgs && cmdArgs.length > 0) {
          const query = cmdArgs.join(' ');
          const playCmd = client.commands.get('play');
          if (playCmd) {
            try {
              const mockMsg = {
                ...messageWrapper,
                content: `${prefix}play ${query}`,
              };
              await playCmd.execute(mockMsg, cmdArgs, client, prefix || '.');
            } catch (err) {
              console.error(`[${botConfig.name}] play error:`, err.message);
            }
          }
        }
      } else {
        const command = client.commands.get(commandName);
        if (!command || command.category !== 'Music') return;
        try {
          const mockMsg = {
            ...messageWrapper,
            content: `${prefix || '.'}${commandName} ${(cmdArgs || []).join(' ')}`,
          };
          await command.execute(mockMsg, cmdArgs || [], client, prefix || '.');
        } catch (err) {
          console.error(`[${botConfig.name}] Command "${commandName}" error:`, err.message);
        }
      }
    }
  });
}

client.once('ready', () => {
  console.log(`[${botConfig.name}] Logged in as ${client.user.tag}`);
});

client.login(botConfig.token).catch(err => {
  console.error(`[${botConfig.name}] Login failed:`, err.message);
  process.exit(1);
});

loadMusicCommands();
setupKazagumo();
