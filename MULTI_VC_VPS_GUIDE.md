# GHOST-MUSIC-2.0 — Multi-VC / Sub-Bot VPS Deployment Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                       LAUNCHER (launcher.js)                  │
│  Port 48901 — HTTP IPC Router                                 │
│  Manages: Main Bot + 3 Sub-Bots                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │              MAIN BOT (Shard.js → index.js)           │     │
│  │  Full Discord Client with sharding                    │     │
│  │  Handles: All non-music commands + Music if free      │     │
│  │  Forwards music to sub-bot when main bot is busy      │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Ghost-1      │  │  Ghost-2      │  │  Ghost-3      │       │
│  │  (subBot.js)  │  │  (subBot.js)  │  │  (subBot.js)  │       │
│  │  Bot Token #1 │  │  Bot Token #2 │  │  Bot Token #3 │       │
│  │  Port 5001    │  │  Port 5002    │  │  Port 5003    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Lavalink Server  │
                    │  (port 6628)     │
                    └──────────────────┘
```

## How It Works

1. User sends a music command (prefix or slash) to the **Main Bot**
2. If the main bot is already playing music in a **different VC**, it:
   - Sends an HTTP POST to the launcher at `127.0.0.1:48901/route`
   - Launcher finds the first free sub-bot
   - Sends an IPC message to the sub-bot
   - Sub-bot executes the command via its own Kazagumo player
3. If the main bot is **free** (no player or in the same VC), it handles the command itself
4. When a sub-bot finishes, it sends `BOT_FREE` to the launcher so it can accept new tasks

## Prerequisites

- **Node.js** v18+ (v20 recommended)
- **npm** v9+
- **Lavalink** server (running and accessible)
- **PM2** (for process persistence)
- **3 Discord Bot Tokens** (one for each sub-bot)

---

## Step 1: Create 3 Discord Bot Applications

1. Go to https://discord.com/developers/applications
2. Create **3 separate applications**: Ghost-1, Ghost-2, Ghost-3
3. For **each** bot:
   - Go to Bot tab → Copy token
   - Enable **ALL Privileged Gateway Intents**:
     - `SERVER MEMBERS INTENT`
     - `MESSAGE CONTENT INTENT`
     - `VOICE STATE INTENT`
4. Invite all 3 bots to your server using OAuth2 URL Generator:
   - Scopes: `bot` `applications.commands`
   - Permissions: `8` (Administrator)

---

## Step 2: Configure Files on VPS

### 2a. Root `config.json` — Sub-Bot Tokens

```json
{
  "subBots": [
    {
      "id": 1,
      "name": "Ghost-1",
      "token": "YOUR_BOT_TOKEN_1",
      "port": 5001
    },
    {
      "id": 2,
      "name": "Ghost-2",
      "token": "YOUR_BOT_TOKEN_2",
      "port": 5002
    },
    {
      "id": 3,
      "name": "Ghost-3",
      "token": "YOUR_BOT_TOKEN_3",
      "port": 5003
    }
  ],
  "mainBotPort": 5000
}
```

### 2b. `src/config.json` — Main Bot Config

Make sure the `token` field is your **main bot** token (already done if main bot is running).

### 2c. `.env` — Spotify Credentials

```
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
```

---

## Step 3: Install PM2 & Start

```bash
# Install PM2 globally
npm install -g pm2

# Stop any existing main bot process
pm2 delete ghost-main 2>/dev/null || true

# Start the launcher (manages all bots)
pm2 start launcher.js --name ghost-multi

# Save process list for auto-restart on reboot
pm2 save

# Optional: set PM2 to start on system boot
pm2 startup
```

---

## Step 4: Verify Everything is Running

```bash
pm2 status
pm2 logs ghost-multi
```

Expected output:
```
[Launcher] Started Main Bot (PID: 12345)
[Launcher] Started Ghost-1 (PID: 12346)
[Launcher] Started Ghost-2 (PID: 12347)
[Launcher] Started Ghost-3 (PID: 12348)
[Ghost-1] Logged in as Ghost-1#0000
[Ghost-2] Logged in as Ghost-2#0000
[Ghost-3] Logged in as Ghost-3#0000
[Ghost-1] Lavalink node "Ghost-Node" connected.
[Ghost-2] Lavalink node "Ghost-Node" connected.
[Ghost-3] Lavalink node "Ghost-Node" connected.
[Launcher] IPC proxy listening on port 48901
```

---

## Code Details — How Sub-Bots Work

### `subBot.js` Key Files & Lines

| File | Lines | What It Does |
|------|-------|-------------|
| `subBot.js` | 1-16 | Loads env, validates `GHOST_BOT_ID` (must be 1, 2, or 3) |
| `subBot.js` | 18-25 | Reads root `config.json` for sub-bot tokens, `src/config.json` for Lavalink config |
| `subBot.js` | 27-35 | Creates a minimal Discord.js **Client** (no sharding) |
| `subBot.js` | 37-47 | Sets up `commands`, `aliases`, `emoji`, `color`, `db`, `logger` |
| `subBot.js` | 51-76 | **`loadMusicCommands()`** — only loads commands from `src/commands/Music/` where `category === 'Music'` |
| `subBot.js` | 78-154 | **`setupKazagumo()`** — Creates its own Kazagumo instance with own Lavalink connection |
| `subBot.js` | 106-113 | **`playerCreate`** — Sets voice status "use .play to add songs" |
| `subBot.js` | 115-123 | **`playerStart`** — Sends minimal "Now Playing" message to text channel |
| `subBot.js` | 125-132 | **`playerEmpty`** — Reset voice status, start 3min inactivity leave timer |
| `subBot.js` | 134-142 | **`playerDestroy`** — Clear voice status, notify launcher `BOT_FREE` |
| `subBot.js` | 163-181 | **`startLeaveTimer()`** — 180s (3 min) auto-leave on empty queue |
| `subBot.js` | 184-188 | **`notifyMainBotFree()`** — IPC: tells launcher this sub-bot is free |
| `subBot.js` | 190-196 | **`isBusyInGuild()`** — Checks if shoukaku has a voice connection for a guild |
| `subBot.js` | 198-218 | **`voiceStateUpdate`** — Handles disconnect/move events |
| `subBot.js` | 220-307 | **IPC Message Handler** — Receives `STATUS_REQUEST` and `HANDLE_COMMAND` from launcher |
| `subBot.js` | 260-275 | Auto-creates player if needed when `HANDLE_COMMAND` is for `play` |
| `subBot.js` | 277-291 | Wraps command execution in a mock message object and calls `playCmd.execute()` |
| `subBot.js` | 309-316 | `ready` event → login |

### `launcher.js` Key Sections

| Lines | What It Does |
|-------|-------------|
| 14-26 | **`startMainBot()`** — Uses `spawn()` to run `Shard.js` as a child process |
| 28-68 | **`startSubBot(index)`** — Uses `fork()` to run `subBot.js` with `GHOST_BOT_ID` env var |
| 71-114 | **`findFreeSubBot()`** — Queries all sub-bots via IPC, finds one where `busy === false` |
| 116-169 | **HTTP Server** (port 48901) — Routes `/route` and `/findfree` POST endpoints |
| 128-149 | `/route` — Assigns command to already-assigned bot or finds free one, queues if all busy |
| 171-178 | Starts main bot + all 3 sub-bots |

### Main Bot Forwarding Logic

In `src/events/Client/messageCreate.js` (lines 210-261):
- If a **Music** command is used AND user is in a VC AND main bot is in a **different** VC
- It forwards the command to `http://127.0.0.1:48901/route`
- The launcher assigns it to a free sub-bot

In `src/events/Client/interactionCreate.js` (lines 94-168):
- Same logic for **slash commands**

---

## Potential Issues & Fixes

### 1. Sub-bot Not Handling Commands

Check if launcher port is accessible:
```bash
curl -X POST http://127.0.0.1:48901/findfree \
  -H "Content-Type: application/json" \
  -d '{"guildId":"YOUR_GUILD_ID"}'
```

### 2. Database Conflicts

All 4 bots (main + 3 sub-bots) share the same `database.db` using SQLite with WAL mode. This is fine for reads but could cause write conflicts. The database is primarily **read** by sub-bots (prefix lookup, user preferences) and **written** by the main bot. If you see `SQLITE_BUSY` errors, it's usually temporary.

### 3. Lavalink Node Limits

A single Lavalink node can handle ~1000 concurrent players. With 3 sub-bots + 1 main bot, all 4 connect to the same node. Ensure your Lavalink server's `lavalink.yml` allows enough connections:

```yaml
server:
  port: 6628
  maxPlayerCount: 1000  # Increase if needed
```

### 4. All Sub-Bots Show "busy"

If you check `pm2 logs` and sub-bots never go free, the `playerDestroy` event may not fire. This can happen if:
- The sub-bot crashes
- Voice connection drops unexpectedly
- Restart the launcher: `pm2 restart ghost-multi`

### 5. `guild.shard.send()` for Non-Sharded Sub-Bots

In `subBot.js` line 82-84, the Kazagumo `send` function uses `guild.shard.send()`. For non-sharded clients (sub-bots), discord.js v14 still provides a `WebSocketShard` per guild via `guild.shard`. This works correctly for forwarding voice state updates to Discord's gateway.

---

## Useful PM2 Commands

```bash
pm2 status                    # View all processes
pm2 logs ghost-multi          # Live logs
pm2 restart ghost-multi       # Restart everything
pm2 stop ghost-multi          # Stop everything
pm2 delete ghost-multi        # Remove from PM2
pm2 startup                   # Auto-start on reboot
pm2 save                      # Save current process list
```

## Troubleshooting Checklist

- [ ] All 3 sub-bot tokens are valid and bots are invited to server
- [ ] Lavalink server is running and accessible from VPS
- [ ] Port 48901 is not blocked by firewall (internal only — no need to expose)
- [ ] Node.js version is v18+
- [ ] All dependencies installed (`npm install`)
- [ ] PM2 process list saved (`pm2 save`)
- [ ] Main bot forwards music commands when busy in another VC
