require('dotenv').config();
require('events').EventEmitter.defaultMaxListeners = 100;
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

// ─── Fix @discordjs/ws v1.2.3 WebSocketShard listener leak ─────
// Bug: waitForEvent() never aborts timeoutController when "closed" wins the race,
// causing events.once() listeners to leak across reconnection cycles.
// Additionally, events.once() adds 'error' listeners that aren't cleaned up by
// the constructor's this._maxListeners=10 (own property shadows prototype).
const { AsyncEventEmitter } = require('@vladfrangu/async_event_emitter');
Object.defineProperty(AsyncEventEmitter.prototype, '_maxListeners', {
  get() { return 100; },
  set() { },
  configurable: true,
});

const { WebSocketShard } = require('@discordjs/ws');
const { once } = require('events');

const __origWaitForEvent = WebSocketShard.prototype.waitForEvent;
WebSocketShard.prototype.waitForEvent = async function (event, timeoutDuration) {
  this.debug([`Waiting for event ${event} ${timeoutDuration ? `for ${timeoutDuration}ms` : "indefinitely"}`]);
  const timeoutController = new AbortController();
  const timeout = timeoutDuration
    ? setTimeout(() => timeoutController.abort(), timeoutDuration).unref()
    : null;
  this.timeoutAbortControllers.set(event, timeoutController);
  const closeController = new AbortController();
  try {
    const closed = await Promise.race([
      once(this, event, { signal: timeoutController.signal }).then(() => false),
      once(this, "closed", { signal: closeController.signal }).then(() => true),
    ]);
    return { ok: !closed };
  } catch {
    void this.destroy({ code: 1000, reason: "waitForEvent timed out", recover: 0 });
    return { ok: false };
  } finally {
    if (timeout) clearTimeout(timeout);
    this.timeoutAbortControllers.delete(event);
    if (!closeController.signal.aborted) closeController.abort();
    if (!timeoutController.signal.aborted) timeoutController.abort();
  }
};
// ────────────────────────────────────────────────────────────────

const { setGlobalDispatcher, Agent } = require("undici");
const agent = new Agent({
  connect: {
    timeout: 60_000,
    keepAlive: true,
  },
  headersTimeout: 60_000,
  bodyTimeout: 60_000,
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 10_000,
  pipelining: 1,
});
setGlobalDispatcher(agent);

const MusicBot = require("./src/structures/MusicClient");
const initializeCleanup = require("./src/events/Client/PremiumChecks");
const config = require("./src/config");

const client = new MusicBot();
module.exports = client;

client.connect().catch(err => console.error('[LOGIN_ERROR]', err));

client.rest.setAgent(agent);

const __origMakeRequest = client.rest.options.makeRequest;
client.rest.options.makeRequest = async (url, opts) => {
  try {
    return await __origMakeRequest(url, opts);
  } catch (err) {
    const code = err?.code || '';
    const isRetryable = code === 'UND_ERR_SOCKET' || code === 'UND_ERR_CLOSED' || (err?.message && err.message.includes('other side closed'));
    if (!isRetryable) throw err;
    console.log(`[REST] Socket error on ${url.slice(0, 60)}..., retrying...`);
    await new Promise(r => setTimeout(r, 2000));
    return __origMakeRequest(url, opts);
  }
};

process.env.SHELL = process.platform === "win32" ? "powershell" : "bash";

const emojis = require("./src/emojis");
client.emoji = emojis;

// Secure developer console (replaces Dokdo)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const prefix = "?";
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (!client.owners.includes(message.author.id)) return;

  if (cmd === "eval" || cmd === "jsk") {
    const code = args.join(" ");
    if (!code) {
      return message.reply("❌ Provide code to evaluate");
    }
    try {
      let result = eval(`(async () => { ${code} })()`);
      if (result instanceof Promise) result = await result;
      if (typeof result !== "string") {
        result = require("util").inspect(result, { depth: 2, showHidden: false });
      }
      if (result.length > 1900) {
        result = result.slice(0, 1900) + "...";
      }
      return message.channel.send({ content: "```js\n" + result + "\n```" });
    } catch (err) {
      return message.channel.send({ content: "```js\n" + err.stack + "\n```" });
    }
  }

  if (cmd === "ping") {
    return message.reply(`🏓 Pong! ${client.ws.ping}ms`);
  }
});

if (client.cluster && client.cluster.id === 0) {
  let startMainBotServer;
  try {
    startMainBotServer = require('./mainBotServer');
  } catch {
    console.warn('[Bridge] mainBotServer.js not found, IPC bridge disabled');
  }
  if (startMainBotServer) {
    client.once('ready', () => {
      startMainBotServer(client);
    });
  }
}

const NETWORK_ERROR_CODES = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_CLOSED',
  'UND_ERR_DESTROYED',
]);

const ABORT_ERROR_CODES = new Set([
  'AbortError',
  'DOMException',
]);

const NETWORK_ERROR_MESSAGES = [
  'fetch failed',
  'other side closed',
  'socket hang up',
  'read ECONNRESET',
  'connect ECONNREFUSED',
  'connect ETIMEDOUT',
  'connect ENETUNREACH',
  'Client network socket',
];

process.on("unhandledRejection", (reason, p) => {
  if (reason) {
    const code = reason.code;
    const name = reason.name;
    const message = reason.message || '';
    const isNetworkError = NETWORK_ERROR_CODES.has(code) || NETWORK_ERROR_MESSAGES.some(m => message.includes(m));
    const isAbortError = ABORT_ERROR_CODES.has(name) || name === 'AbortError' || code === 'ABORT_ERR' || message.includes('aborted');

    if (isNetworkError || isAbortError) {
      console.log(`[Network] Suppressed ${code || name || 'fetch'}: ${message.slice(0, 120)}`);
      return;
    }
  }

  console.log("[Unhandled Rejection]", reason, p);

  if (reason && reason.message && reason.message.includes('Session not found')) {
    console.log("[Session Error] Lavalink session lost, attempting cleanup...");

    if (reason.path && typeof reason.path === 'string') {
      const guildIdMatch = reason.path.match(/\/players\/(\d+)/);
      if (guildIdMatch && guildIdMatch[1]) {
        const guildId = guildIdMatch[1];
        console.log(`[Session Error] Cleaning up player for guild ${guildId}`);

        try {
          if (client.manager && client.manager.players.has(guildId)) {
            client.manager.players.delete(guildId);
          }

          if (client.voiceHealthMonitor) {
            client.voiceHealthMonitor.stopMonitoring(guildId);
          }
        } catch (cleanupError) {
          console.error("[Session Error] Cleanup failed:", cleanupError);
        }
      }
    }
  }
});

process.on("uncaughtException", (err, origin) => {
  console.log("[Uncaught Exception]", err, origin);
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  console.log("[Uncaught Exception Monitor]", err, origin);
});

initializeCleanup(client);
