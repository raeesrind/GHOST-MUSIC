const BetterSqlite3 = require('better-sqlite3');
const path = require('path');

const db = new BetterSqlite3(path.join(process.cwd(), 'database.db'));

db.pragma('journal_mode = WAL');

const tables = [
  {
    name: 'message_counts',
    schema: `guild_id TEXT, user_id TEXT, total INTEGER DEFAULT 0, today INTEGER DEFAULT 0, last_date TEXT, last_message_ts INTEGER DEFAULT 0, PRIMARY KEY (guild_id, user_id)`
  },
  {
    name: 'message_blacklist',
    schema: `guild_id TEXT, channel_id TEXT, PRIMARY KEY (guild_id, channel_id)`
  },
  {
    name: 'daily_message_counts',
    schema: `guild_id TEXT, user_id TEXT, date TEXT, count INTEGER DEFAULT 0, PRIMARY KEY (guild_id, user_id, date)`
  },
  {
    name: 'greet_configs',
    schema: `guild_id TEXT, channel_id TEXT, style TEXT DEFAULT 'simple', title TEXT, description TEXT, message TEXT, thumbnail TEXT, image_url TEXT, color TEXT DEFAULT '#FFFFFF', auto_delete INTEGER DEFAULT 0, PRIMARY KEY (guild_id, channel_id)`
  },
  {
    name: 'invite_config',
    schema: `guild_id TEXT PRIMARY KEY, join_channel_id TEXT, join_message TEXT, leave_channel_id TEXT, leave_message TEXT`
  }
];

tables.forEach(table => {
  db.prepare(`CREATE TABLE IF NOT EXISTS ${table.name} (${table.schema})`).run();
});

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_message_counts_guild ON message_counts(guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_message_counts_user ON message_counts(guild_id, user_id)',
  'CREATE INDEX IF NOT EXISTS idx_daily_counts ON daily_message_counts(guild_id, date)',
  'CREATE INDEX IF NOT EXISTS idx_greet_configs ON greet_configs(guild_id)'
];

indexes.forEach(idx => {
  try { db.prepare(idx).run(); } catch (e) {}
});

const messageCounts = {
  get(guildId, userId) {
    return db.prepare('SELECT * FROM message_counts WHERE guild_id = ? AND user_id = ?').get(guildId, userId) || { total: 0, today: 0 };
  },
  increment(guildId, userId) {
    const today = new Date().toISOString().split('T')[0];
    const row = db.prepare('SELECT * FROM message_counts WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (row) {
      db.prepare('UPDATE message_counts SET total = total + 1, today = CASE WHEN last_date = ? THEN today + 1 ELSE 1 END, last_date = ?, last_message_ts = ? WHERE guild_id = ? AND user_id = ?').run(today, today, Date.now(), guildId, userId);
    } else {
      db.prepare('INSERT INTO message_counts (guild_id, user_id, total, today, last_date, last_message_ts) VALUES (?, ?, 1, 1, ?, ?)').run(guildId, userId, today, Date.now());
    }
    db.prepare('INSERT INTO daily_message_counts (guild_id, user_id, date, count) VALUES (?, ?, ?, 1) ON CONFLICT(guild_id, user_id, date) DO UPDATE SET count = count + 1').run(guildId, userId, today);
  },
  add(guildId, userId, amount) {
    const row = db.prepare('SELECT * FROM message_counts WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (row) {
      db.prepare('UPDATE message_counts SET total = total + ? WHERE guild_id = ? AND user_id = ?').run(amount, guildId, userId);
    } else {
      db.prepare('INSERT INTO message_counts (guild_id, user_id, total) VALUES (?, ?, ?)').run(guildId, userId, amount);
    }
  },
  remove(guildId, userId, amount) {
    const row = db.prepare('SELECT * FROM message_counts WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (row) {
      const newTotal = Math.max(0, row.total - amount);
      db.prepare('UPDATE message_counts SET total = ? WHERE guild_id = ? AND user_id = ?').run(newTotal, guildId, userId);
    }
  },
  clear(guildId, userId) {
    db.prepare('DELETE FROM message_counts WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  },
  resetMy(guildId, userId) {
    db.prepare('UPDATE message_counts SET total = 0, today = 0 WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  },
  getLeaderboard(guildId, limit = 10) {
    return db.prepare('SELECT * FROM message_counts WHERE guild_id = ? AND total > 0 ORDER BY total DESC LIMIT ?').all(guildId, limit);
  },
  getDailyLeaderboard(guildId, date, limit = 10) {
    return db.prepare('SELECT * FROM daily_message_counts WHERE guild_id = ? AND date = ? AND count > 0 ORDER BY count DESC LIMIT ?').all(guildId, date, limit);
  }
};

const messageBlacklist = {
  add(guildId, channelId) {
    db.prepare('INSERT OR IGNORE INTO message_blacklist (guild_id, channel_id) VALUES (?, ?)').run(guildId, channelId);
  },
  remove(guildId, channelId) {
    db.prepare('DELETE FROM message_blacklist WHERE guild_id = ? AND channel_id = ?').run(guildId, channelId);
  },
  getAll(guildId) {
    return db.prepare('SELECT * FROM message_blacklist WHERE guild_id = ?').all(guildId);
  },
  isBlacklisted(guildId, channelId) {
    return !!db.prepare('SELECT 1 FROM message_blacklist WHERE guild_id = ? AND channel_id = ?').get(guildId, channelId);
  }
};

const greetConfigs = {
  get(guildId) {
    return db.prepare('SELECT * FROM greet_configs WHERE guild_id = ?').all(guildId);
  },
  getByChannel(guildId, channelId) {
    return db.prepare('SELECT * FROM greet_configs WHERE guild_id = ? AND channel_id = ?').get(guildId, channelId);
  },
  set(guildId, channelId, data) {
    const exists = db.prepare('SELECT 1 FROM greet_configs WHERE guild_id = ? AND channel_id = ?').get(guildId, channelId);
    if (exists) {
      const updates = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const vals = Object.values(data);
      db.prepare(`UPDATE greet_configs SET ${updates} WHERE guild_id = ? AND channel_id = ?`).run(...vals, guildId, channelId);
    } else {
      const keys = ['guild_id', 'channel_id', ...Object.keys(data)];
      const vals = [guildId, channelId, ...Object.values(data)];
      db.prepare(`INSERT INTO greet_configs (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
    }
  },
  delete(guildId, channelId) {
    db.prepare('DELETE FROM greet_configs WHERE guild_id = ? AND channel_id = ?').run(guildId, channelId);
  },
  deleteAll(guildId) {
    db.prepare('DELETE FROM greet_configs WHERE guild_id = ?').run(guildId);
  },
  count(guildId) {
    const r = db.prepare('SELECT COUNT(*) as count FROM greet_configs WHERE guild_id = ?').get(guildId);
    return r ? r.count : 0;
  }
};

const inviteConfig = {
  get(guildId) {
    return db.prepare('SELECT * FROM invite_config WHERE guild_id = ?').get(guildId) || {};
  },
  setJoinChannel(guildId, channelId) {
    db.prepare('INSERT INTO invite_config (guild_id, join_channel_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET join_channel_id = ?').run(guildId, channelId, channelId);
  },
  setJoinMessage(guildId, message) {
    db.prepare('INSERT INTO invite_config (guild_id, join_message) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET join_message = ?').run(guildId, message, message);
  },
  setLeaveChannel(guildId, channelId) {
    db.prepare('INSERT INTO invite_config (guild_id, leave_channel_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET leave_channel_id = ?').run(guildId, channelId, channelId);
  },
  setLeaveMessage(guildId, message) {
    db.prepare('INSERT INTO invite_config (guild_id, leave_message) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET leave_message = ?').run(guildId, message, message);
  },
  unsetJoinChannel(guildId) {
    db.prepare('UPDATE invite_config SET join_channel_id = NULL WHERE guild_id = ?').run(guildId);
  },
  unsetJoinMessage(guildId) {
    db.prepare('UPDATE invite_config SET join_message = NULL WHERE guild_id = ?').run(guildId);
  },
  unsetLeaveChannel(guildId) {
    db.prepare('UPDATE invite_config SET leave_channel_id = NULL WHERE guild_id = ?').run(guildId);
  },
  unsetLeaveMessage(guildId) {
    db.prepare('UPDATE invite_config SET leave_message = NULL WHERE guild_id = ?').run(guildId);
  }
};

module.exports = { messageCounts, messageBlacklist, greetConfigs, inviteConfig };
