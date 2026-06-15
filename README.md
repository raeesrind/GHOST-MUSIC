<div align="center">

# 👻 GHOST-MUSIC

**A powerful multi-client Discord Music & Utility Bot**

![Discord.js](https://img.shields.io/badge/discord.js-v14.22.1-5865F2?logo=discord)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0-339933?logo=node.js)
![Lavalink](https://img.shields.io/badge/Lavalink-Kazagumo%203.3.0-FF6EC7)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-online-00FF00)

---

</div>

## 📋 Table of Contents

- [Features](#-features)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Project Structure](#-project-structure)
- [Commands](#-commands)
  - [🎵 Music](#-music)
  - [🛡️ Moderation](#️-moderation)
  - [🔧 Config](#-config)
  - [⭐ Favourite](#-favourite)
  - [🎚️ Filters](#️-filters)
  - [🎉 Giveaway](#-giveaway)
  - [👋 Greet](#-greet)
  - [📜 Information](#-information)
  - [📊 Leveling](#-leveling)
  - [💬 Messages](#-messages)
  - [🔨 Owner](#-owner)
  - [📋 Polls](#-polls)
  - [🎫 Ticket](#-ticket)
  - [📈 Tracker](#-tracker)
  - [🛠️ Utility](#️-utility)
  - [🔊 Voice](#-voice)
- [Events](#-events)
- [Configuration](#-configuration)
- [Architecture](#-architecture)

---

## ✨ Features

- 🎵 **Music Playback** — `/play`, `/skip`, `/queue`, `/stop`, `/pause`, `/resume`, `/loop`, `/shuffle`, `/seek`, `/forward`, `/rewind`, `/search`, `/lyrics`, `/autoplay`, and more. Powered by Kazagumo + Lavalink.
- 🔍 **User Info** — `/userinfo` (alias `/ui`) with interactive buttons for **Avatar**, **Banner**, **Ban Info** (conditional), and **Timeout Info** (conditional).
- 🛡️ **Moderation** — `/ban`, `/kick`, `/mute`, `/unmute`, `/purge`, `/nuke`, `/lock`, `/unlock`, `/hide`, `/unhide`, `/role`, `/rename`, `/snipe`.
- 🌐 **Multi-Bot Architecture** — Main bot + 3 sub-bots for load-balanced music playback across multiple voice channels.
- ⭐ **Favourites** — `/like`, `/playliked`, `/showliked` to save and replay your favorite tracks.
- 🎉 **Giveaway System** — Create, end, and reroll giveaways with `/gstart`, `/gend`, `/greroll`.
- 👋 **Greet System** — Customizable join/leave messages with variables via `/greet` and `/greetsetup`.
- 📊 **Leveling & XP** — `/rank`, `/leaderboard` with XP tracking, role rewards, and configurable multipliers.
- 💬 **Message Tracking** — Track message counts per user with blacklist channels.
- 🎫 **Ticket System** — Full ticket management with `/panel`, `/add`, `/remove`, `/close`, `/reopen`, `/delete`.
- 📈 **Invite Tracker** — Track invites, set join/leave messages, and view inviter stats.
- 🔨 **Owner Tools** — Server list, eval, emoji management, backup, no-prefix access, branding, and more.
- 🎨 **Styled Embeds** — All embeds and buttons use emoji icons from `src/emojis.js` with consistent styling via `ContainerBuilder`, `SectionBuilder`, and `TextDisplayBuilder`.

---

## 📦 Requirements

| Dependency | Version |
|------------|---------|
| [Node.js](https://nodejs.org/) | >= 18.0 |
| [discord.js](https://discord.js.org/) | 14.22.1 |
| [Kazagumo](https://www.npmjs.com/package/kazagumo) | 3.3.0 |
| [Shoukaku](https://www.npmjs.com/package/shoukaku) | 4.1.1 |
| [Lavalink](https://github.com/lavalink-devs/Lavalink) | Server (v4) |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.6.2 |
| [discord-hybrid-sharding](https://www.npmjs.com/package/discord-hybrid-sharding) | 2.2.6 |

Full dependency list in [`package.json`](package.json).

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/raeesrind/GHOST-MUSIC.git
cd GHOST-MUSIC
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file in the root directory:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### 4. Configure the bot

Edit `config.json` with your bot tokens:

```json
{
  "subBots": [
    {
      "id": 1,
      "name": "Ghost-1",
      "token": "your_bot_token_1",
      "port": 5001
    },
    {
      "id": 2,
      "name": "Ghost-2",
      "token": "your_bot_token_2",
      "port": 5002
    },
    {
      "id": 3,
      "name": "Ghost-3",
      "token": "your_bot_token_3",
      "port": 5003
    }
  ],
  "mainBotPort": 5000
}
```

### 5. Start a Lavalink server

GHOST-MUSIC requires a running Lavalink server. Refer to the [Lavalink documentation](https://github.com/lavalink-devs/Lavalink) for setup.

### 6. Run the bot

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

---

## 📁 Project Structure

```
GHOST-MUSIC/
├── Shard.js                       # Sharding/cluster manager entry point
├── index.js                       # Main bot client entry
├── subBot.js                      # Sub-bot client (load-balanced music)
├── launcher.js                    # Launcher for multi-bot orchestration
├── stateManager.js                # State management across bot instances
├── mainBotServer.js               # Express HTTP server for inter-bot IPC
├── deploy-commands.js             # Global slash command deployment script
├── config.json                    # Bot tokens, ports, multi-bot config
├── .env                           # Spotify API credentials
├── package.json                   # Project dependencies
├── assets/                        # Static assets (fonts, images)
│   ├── rankghost.png
│   ├── ghost.png
│   └── fonts/
│       └── ARIAL.TTF
├── database.db                    # SQLite database (runtime)
├── ghost.db                       # Legacy XP database (import source)
├── src/
│   ├── config.js                  # Config loader (reads config.json)
│   ├── emojis.js                  # Emoji constants for all embed/button usage
│   ├── structures/
│   │   ├── MusicClient.js         # Main Client class (intents, sharding, plugins)
│   │   └── Database.js            # SQLite database abstraction layer
│   ├── loaders/
│   │   ├── commandLoader.js       # Loads prefix commands into client.commands
│   │   ├── loadCommands.js        # Loads commands and registers slash data
│   │   ├── loadClients.js         # Initializes sub-bot clients and connections
│   │   ├── loadNodes.js           # Loads Lavalink nodes for Kazagumo
│   │   ├── loadPlayerManager.js   # Configures Kazagumo player manager
│   │   └── loadPlayers.js         # Manages active music players
│   ├── commands/
│   │   ├── Music/                 # 36 music commands (play, skip, queue, etc.)
│   │   ├── Moderation/            # 18 moderation commands (ban, kick, mute, etc.)
│   │   ├── Utility/               # 28 utility commands (userinfo, avatar, etc.)
│   │   ├── Owner/                 # 21 owner-only commands
│   │   ├── Config/                # 5 server config commands
│   │   ├── Automod/               # Auto-moderation management
│   │   ├── Favourite/             # 6 favorite/like commands
│   │   ├── Filters/               # Audio equalizer filter command
│   │   ├── Giveaway/              # 4 giveaway commands
│   │   ├── Greet/                 # 6 greet/welcome commands
│   │   ├── Information/           # 11 info commands (help, ping, stats, etc.)
│   │   ├── Leveling/              # 8 leveling/XP commands (+ sub-commands)
│   │   ├── Messages/              # 8 message tracking commands
│   │   ├── Polls/                 # 2 poll commands
│   │   ├── Ticket/                # 7 ticket system commands
│   │   ├── Tracker/               # 20 invite tracker commands
│   │   └── Voice/                 # Voice moderation command
│   ├── events/
│   │   ├── Client/                # 18 client events (ready, messageCreate, etc.)
│   │   ├── Players/               # 10 Lavalink player events
│   │   └── Node/                  # 4 Lavalink node events
│   ├── custom/
│   │   ├── embed.js               # Embed builder factory
│   │   ├── button.js              # Button builder factory
│   │   └── numformat.js           # Number formatting utility
│   └── utils/
│       ├── xpMath.js              # XP/level calculation formulas
│       ├── logger.js              # Logging utility
│       ├── ticketManager.js       # Ticket system logic
│       ├── ticketUI.js            # Ticket panel UI builder
│       ├── giveawayManager.js     # Giveaway lifecycle management
│       ├── automodManager.js      # Auto-moderation engine
│       ├── voiceHealthMonitor.js  # Voice connection health checker
│       ├── voiceConnect.js        # Voice channel connection helper
│       ├── permissionCheck.js     # Bot rank permission checker
│       ├── checkNoPrefixAccess.js # No-prefix access validation
│       ├── emojiAPI.js            # Emoji API methods
│       ├── emojiParser.js         # Emoji string parser
│       ├── convert.js             # Data conversion utilities
│       ├── lastfm.js              # Last.fm API integration
│       ├── nodeUtils.js           # Lavalink node utilities
│       ├── playerUtils.js         # Music player helpers
│       ├── progressbar.js         # Progress bar generator
│       ├── security.js            # Security utilities
│       └── newFeaturesDb.js       # Feature flag database
└── Falcron/                       # (Secondary bot — separate codebase)
```

---

## 🤖 Commands

### 🎵 Music

| Command | Aliases | Description |
|---------|---------|-------------|
| `/play` | `p` | Plays a song or playlist |
| `skip` | `s` | Skips the current song |
| `stop` | — | Stops the music and clears the queue |
| `pause` | — | Pauses playback |
| `resume` | `r` | Resumes paused playback |
| `queue` | `q` | Shows the server queue |
| `nowplaying` | `np` | Shows the currently playing song |
| `join` | `j` | Joins your voice channel |
| `leave` | `dc`, `disconnect` | Leaves the voice channel |
| `volume` | `v`, `vol` | Adjusts playback volume |
| `loop` | — | Loops the current song or queue |
| `shuffle` | — | Shuffles the queue |
| `clearqueue` | `cq`, `clearq` | Clears all songs from the queue |
| `forward` | `ff`, `fastforward` | Fast-forwards by a duration |
| `rewind` | `rw`, `backward` | Rewinds by a duration |
| `seek` | — | Seeks to a specific timestamp |
| `/search` | `find` | Searches for songs and adds them |
| `grab` | `save` | DMs you the current song details |
| `lyrics` | `ly`, `lyric` | Shows lyrics for the current song |
| `autoplay` | `ap`, `auto` | Toggles auto-play of related songs |
| `previous` | `back`, `prev` | Plays the previous song from history |
| `forceskip` | `fs` | Force-skips (bypasses vote-skip) |
| `move` | `mv` | Moves the bot to your voice channel |
| `remove` | `rm` | Removes a track from the queue |
| `skipto` | `jump` | Skips to a specific queue position |
| `replay` | `restart`, `rp` | Replays the current song from the start |
| `history` | `played`, `recent` | Shows recently played songs |
| `speed` | `playback`, `tempo` | Changes playback speed |
| `sleep` | `sleeptimer`, `timer` | Sets a sleep timer to auto-stop |
| `mood` | `genre`, `vibe` | Plays music by mood or genre |
| `/music` | — | Group command for music controls |
| `/setmusic` | — | Music settings and playback controls |
| `artistradio` | `ar`, `radio` | Starts radio from similar artists |
| `similar` | `sim`, `related` | Gets similar songs to current track |
| `leavecleanup` | `lc` | Removes absent users' songs from queue |
| `forcefix` | `fix` | Fixes bot not playing/joining issues |

### 🛡️ Moderation

| Command | Aliases | Description |
|---------|---------|-------------|
| `/ban` | — | Bans a member from the server |
| `/kick` | — | Kicks a member |
| `/mute` | — | Timeouts a member |
| `/unmute` | — | Removes timeout from a member |
| `/purge` | `clear`, `c` | Bulk-deletes messages with filters |
| `nuke` | `rebuild` | Clones and deletes the current channel |
| `lock` | — | Locks a channel |
| `unlock` | — | Unlocks a channel |
| `lockall` | — | Locks all text channels |
| `unlockall` | — | Unlocks all text channels |
| `hide` | — | Hides a channel |
| `unhide` | — | Unhides a channel |
| `hideall` | — | Hides all text channels |
| `unhideall` | — | Unhides all text channels |
| `role` | — | Manages roles for users |
| `rename` | — | Renames a channel |
| `snipe` | — | Shows the last deleted message |
| `/unban` | — | Unbans a user |

### 🔧 Config

| Command | Aliases | Description |
|---------|---------|-------------|
| `/config` | — | Server configuration group command |
| `setprefix` | `prefix` | Sets a custom prefix for the server |
| `247` | `24/7`, `alwayson` | Enables 24/7 mode |
| `ignore` | `ig` | Ignores a channel from bot commands |
| `/source` | — | Sets preferred music source (YouTube, Spotify, etc.) |

### ⭐ Favourite

| Command | Aliases | Description |
|---------|---------|-------------|
| `/fav` | — | Favourite songs management group |
| `like` | `fav`, `favourite`, `favorite` | Adds current song to favorites |
| `likeall` | `lall`, `likequeue` | Adds all queue songs to favorites |
| `playliked` | `pfav`, `playfav`, `playfavorites` | Plays your favorite songs |
| `showliked` | — | Shows your favorite songs |
| `unlike` | — | Removes a song from favorites |

### 🎚️ Filters

| Command | Aliases | Description |
|---------|---------|-------------|
| `filter` | `eq`, `filters` | Applies audio equalizer filters |

### 🎉 Giveaway

| Command | Aliases | Description |
|---------|---------|-------------|
| `/gstart` | `giveawaystart`, `gcreate` | Starts a giveaway |
| `/gend` | `giveawayend`, `gstop` | Ends a giveaway manually |
| `/greroll` | `giveawayreroll` | Rerolls a giveaway winner |
| `/gwy` | — | Giveaway management group command |

### 👋 Greet

| Command | Aliases | Description |
|---------|---------|-------------|
| `/greet` | — | Sets the greet message channel |
| `greetsetup` | — | Sets up welcome messages with customization |
| `/disablegreet` | — | Removes a greet channel config |
| `greetchannels` | — | Lists all configured greet channels |
| `greetreset` | — | Resets all greet settings |
| `greetvariables` | — | Shows available greet message variables |

### 📜 Information

| Command | Aliases | Description |
|---------|---------|-------------|
| `/help` | `h` | Shows all commands grouped by category |
| `/ping` | `latency`, `pong` | Displays bot latencies |
| `stats` | — | Shows detailed bot statistics |
| `uptime` | `up` | Shows the bot's uptime |
| `/profile` | `pr` | Displays your custom bot profile card |
| `bio` | — | Manages your profile bio |
| `/info` | — | Bot information group command |
| `invite` | `inv` | Gets the bot's invite link |
| `links` | `botlinks`, `subbots` | Gets invite links for all sub-bots |
| `support` | — | Gets the support server invite |
| `users` | `botusers` | Shows total users and servers |

### 📊 Leveling

| Command | Aliases | Description |
|---------|---------|-------------|
| `rank` | `level`, `lvl` | Shows your or another user's rank card with XP bar |
| `leaderboard` | `lb`, `top` | Shows the server XP leaderboard |
| `/leveling` | `lvl`, `levels` | Leveling management group command |
| `admin_config` | — | Sub-commands: `enableleveling`, `disableleveling`, `cooldown`, `globalmult`, `setlevelmsg`, `resetlevelmsg` |
| `admin_multipliers` | — | Sub-commands: `channelxpmultiplier`, `removechannelxpmultiplier`, `rolexpmultiplier`, `removerolexpmultiplier` |
| `admin_noxp` | — | Sub-commands: `noxpchannel`, `noxpremove`, `noxplist` |
| `admin_roles` | — | Sub-commands: `addlevelrole`, `removelevelrole`, `listlevelroles`, `setrolemode`, `setrankupmode` |
| `admin_xp` | — | Sub-commands: `givexp`, `removexp`, `givelvl`, `remlvl`, `resetxp` |

### 💬 Messages

| Command | Aliases | Description |
|---------|---------|-------------|
| `/messages` | `m` | Shows a user's message count in the server |
| `/addmessages` | `addmsg` | Manually adds messages to a user's count |
| `/removemessages` | `removemsg` | Removes messages from a user's count |
| `/clearmessages` | `clearmsg`, `resetmessages` | Resets a user's message count |
| `resetmymessages` | `resetmymsgs` | Resets your own message count |
| `/blacklistchannel` | `blchannel` | Blacklists a channel from counting |
| `blacklistedchannels` | `blchannels` | Lists all blacklisted channels |
| `/unblacklistchannel` | `unblchannel` | Removes a channel blacklist |

### 🔨 Owner

| Command | Aliases | Description |
|---------|---------|-------------|
| `restart` | — | Restarts the bot |
| `blacklist` | `bl` | Blacklists a user or guild |
| `node` | — | Shows Lavalink node information |
| `serverlist` | — | Lists all servers the bot is in |
| `leaveserver` | `lv` | Makes the bot leave a server |
| `getinv` | `ginv` | Gets an invite for a server |
| `mutual` | `mutualservers`, `sharedservers` | Shows mutual servers |
| `team` | — | Manages bot team ranks |
| `backup` | — | Creates a source code backup |
| `badge` | — | Adds/removes user badges |
| `/branding` | `setprofile`, `botprofile`, `customize` | Customizes bot server profile |
| `active` | `playing`, `act` | Shows active music players |
| `adddev` | — | Adds a bot developer |
| `removedev` | — | Removes a bot developer |
| `botemoji` | `be`, `bel`, `bea`, `ber`, `bern` | Manages application emojis |
| `stealemoji` | `steal`, `stealemojis` | Steals emojis from messages |
| `setnpchannel` | `setnpc`, `npchannel` | Sets up no-prefix access panel |
| `importxp` | `importlevel`, `importlb` | Imports XP from ghost.db |
| `grantnoprefix` | `gnp` | Grants no-prefix access to a guild |
| `revokenoprefix` | `rnp` | Revokes no-prefix access |
| `nopaccess` | `nopperms`, `nop` | Manages global no-prefix access |

### 📋 Polls

| Command | Aliases | Description |
|---------|---------|-------------|
| `createpoll` | — | Creates a Discord poll |
| `/epoll` | — | Ends an active poll |

### 🎫 Ticket

| Command | Aliases | Description |
|---------|---------|-------------|
| `/panel` | `tpanel` | Manages ticket panels |
| `/add` | `tadd` | Adds a user to a ticket |
| `/remove` | `tremove` | Removes a user from a ticket |
| `/close` | `tclose` | Closes a ticket |
| `/reopen` | `treopen` | Reopens a closed ticket |
| `/delete` | `tdelete` | Deletes a closed ticket |
| `tsettings` | `ticketsettings` | Configures ticket system settings |

### 📈 Tracker

| Command | Aliases | Description |
|---------|---------|-------------|
| `invites` | — | Shows invite statistics |
| `invitetracking` | `invitetrack`, `trackinvites` | Toggles invite tracking |
| `trackerleaderboard` | — | Invite leaderboard |
| `/inviter` | `whoinvited`, `invitedby` | Shows who invited a user |
| `invited` | `myinvited`, `invitedlist` | Shows users you invited |
| `/invitecodes` | `invitecode`, `ic` | Shows invite codes with usage |
| `/addinvites` | — | Manually adds invites |
| `/removeinvites` | — | Removes invites |
| `/resetmyinvites` | `rmi`, `clearmyinvites` | Resets your invites |
| `/clearinvites` | `resetinvites`, `wipeinvites` | Clears all invite tracking data |
| `/setjoinchannel` | — | Sets the welcome message channel |
| `/setjoinmessage` | — | Sets a custom join message |
| `/setleavechannel` | — | Sets the leave message channel |
| `/setleavemessage` | — | Sets a custom leave message |
| `unsetjoinmessage` | — | Resets the join message to default |
| `unsetleavechannel` | — | Disables leave messages |
| `unsetleavemessage` | — | Resets the leave message to default |
| `unsetwelcomechannel` | — | Disables welcome messages |
| `/testmessage` | — | Previews a message template |
| `variables` | — | Shows available message variables |

### 🔊 Voice

| Command | Aliases | Description |
|---------|---------|-------------|
| `voice` | `vc` | Voice moderation commands |

---

## 📡 Events

### Client Events (18 total)

| Event | File | Purpose |
|-------|------|---------|
| `ready` | `ready.js` | Deploys slash commands, caches invites, manages reboot state, sets presence |
| `messageCreate` | `messageCreate.js` | Routes prefix commands, handles mentions, runs automod, tracks XP/messages |
| `interactionCreate` | `interactionCreate.js` | Handles slash commands, buttons, modals; routes to sub-bots for music |
| `guildCreate` | `guildCreate.js` | Logs new guild joins |
| `guildDelete` | `guildDelete.js` | Cleans up guild data on leave |
| `GuildMemberAdd` | `GuildMemberAdd.js` | Handles welcome messages, invite tracking, greet messages |
| `GuildMemberRemove` | `GuildMemberRemove.js` | Handles leave messages, invite tracking cleanup |
| `messageDelete` | `messageDelete.js` | Saves deleted messages for snipe command |
| `messageReactionAdd` | `messageReactionAdd.js` | Giveaway reaction entry handling |
| `messageReactionRemove` | `messageReactionRemove.js` | Giveaway reaction removal handling |
| `inviteCreate` | `inviteCreate.js` | Tracks new invite codes |
| `inviteDelete` | `inviteDelete.js` | Removes deleted invite codes from cache |
| `messageCounter` | `messageCounter.js` | Increments per-user message counts |
| `xpHandler` | `xpHandler.js` | Grants XP on message activity |
| `BioUpdater` | `BioUpdater.js` | Periodically updates bot bio |
| `AutoDestroy` | `AutoDestroy.js` | Destroys idle voice connections (anti-leech) |
| `PremiumChecks` | `PremiumChecks.js` | Validates premium subscriptions |
| `ticketChannelDelete` | `ticketChannelDelete.js` | Cleans up ticket data when channel is deleted |

### Lavalink Player Events (10 total)

| Event | Purpose |
|-------|---------|
| `playerCreate` | Player created for a guild |
| `playerDestroy` | Player destroyed |
| `playerEmpty` | Queue is empty (auto-leave timer starts) |
| `playerEnd` | Track ended naturally |
| `playerError` | Track error |
| `playerException` | Track exception |
| `playerResumed` | Player resumed after disconnect |
| `playerSkip` | Track was skipped |
| `playerStart` | Track started playing |
| `playerUpdate` | Player state update |

### Lavalink Node Events (4 total)

| Event | Purpose |
|-------|---------|
| `ready` | Lavalink node connected |
| `error` | Node error |
| `disconnect` | Node disconnected |
| `close` | Node connection closed |

---

## ⚙️ Configuration

### `config.json`

The main configuration file holds bot tokens and multi-bot settings:

| Field | Description |
|-------|-------------|
| `subBots[]` | Array of sub-bot configs (id, name, token, port) |
| `subBots[].id` | Numeric ID for the sub-bot |
| `subBots[].name` | Display name for the sub-bot |
| `subBots[].token` | Discord bot token |
| `subBots[].port` | HTTP server port for inter-process communication |
| `mainBotPort` | Port for the main bot's HTTP server |

### `src/config.js`

Reads `config.json` and exports it, adding a `parseBoolean` helper. The `MusicClient` class reads:

- `client.config.token` — used for Discord login (set in `MusicClient` constructor)
- `client.config.prefix` — default command prefix
- `client.config.color` — default embed color
- `client.config.ownerID` — bot owner Discord IDs
- `client.config.Webhooks.cmdrun` — webhook URL for command logging

### `src/emojis.js`

All emoji constants used throughout the bot for embeds, buttons, and messages. Key exports include:

`like`, `previous`, `skip`, `volup`, `voldown`, `stop`, `play`, `pause`, `warn`, `load`, `dot`, `cross`, `check`, `info`, `applemusic`, `ytmusic`, `staff`, `developer`, `manager`, `admin`, `streaming`, `idle`, `dnd`, `add`, `duration`, `shuffle`, `loop`, `dance`, `youtube`, `spotify`, `deezer`, `jiosaavn`, `soundcloud`, `moderation`, `tracker`, `filters`, `utility`, `automod`, `config`, `favourite`, `music`, `home`, `ticket`, `lock`, `unlock`, `trash`, `starFill`, `starEmpty`, `settings`, `remove`, `logs`, `leveling`, `dashboard`, `user`, `id`, `reason`, `mod`, `date`, `clock`, `ban`, `timeout`

---

## 🏗️ Architecture

GHOST-MUSIC uses a **multi-client architecture** for load-balanced music playback:

1. **Shard.js** — Entry point using `discord-hybrid-sharding` to spawn clusters. Uses auto-sharding with 1 shard per cluster. Retries on rate limit (up to 5 attempts).

2. **index.js** — Main bot client (`MusicClient` class extending `Client`). Handles all non-music commands, moderation, utility, leveling, tickets, etc. Fixes WebSocket listener memory leaks from `@discordjs/ws`.

3. **subBot.js** — Secondary bot instances for music playback. Each sub-bot connects to a subset of guilds to distribute voice connection load.

4. **launcher.js + stateManager.js** — Orchestrates which guilds are assigned to which sub-bot. Routes music commands to the appropriate sub-bot via HTTP IPC.

5. **mainBotServer.js** — Express HTTP server for inter-bot communication. Sub-bots register with the main bot, which routes `play`/`skip`/etc. commands to the correct sub-bot based on guild assignment.

6. **Kazagumo + Shoukaku** — Lavalink wrapper for high-quality audio playback. Supports YouTube, Spotify, SoundCloud, Deezer, JioSaavn, and Apple Music.

7. **SQLite Database** — `better-sqlite3` backing for persistent storage of prefixes, XP data, ticket configs, giveaway state, invite tracking, and all other server settings.

---

<div align="center">

**GHOST-MUSIC** — Built with discord.js v14, Kazagumo, and Lavalink

</div>
