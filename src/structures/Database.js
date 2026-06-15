const BetterSqlite3 = require('better-sqlite3');
const path = require('path');

const db = new BetterSqlite3(path.join(process.cwd(), 'database.db'));


db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -32000');
db.pragma('temp_store = MEMORY');
db.pragma('mmap_size = 1073741824');
db.pragma('page_size = 4096');


const serialize = (data) => JSON.stringify(data);
const deserialize = (data, fallback = []) => {
    try {
        if (!data) return fallback;
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        return fallback;
    }
};

// Prepared statement cache for performance
const stmtCache = new Map();
const getStatement = (sql) => {
    if (!stmtCache.has(sql)) {
        stmtCache.set(sql, db.prepare(sql));
    }
    return stmtCache.get(sql);
};


const tables = [
    {
        name: 'profiles',
        schema: `
            userId TEXT PRIMARY KEY,
            bio TEXT DEFAULT 'No bio set',
            badges TEXT DEFAULT '[]',
            friends TEXT DEFAULT '[]',
            marry TEXT DEFAULT 'None',
            rank TEXT DEFAULT 'User',
            deniedCommands TEXT DEFAULT '[]',
            allowedCommands TEXT DEFAULT '[]'
        `
    },
    {
        name: 'liked',
        schema: `
            userId TEXT PRIMARY KEY,
            songs TEXT DEFAULT '[]'
        `
    },
    {
        name: 'noprefix',
        schema: `
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            guildId TEXT,
            noprefix INTEGER DEFAULT 0,
            expiresAt TEXT
        `
    },
    {
        name: 'blacklist',
        schema: `
            userId TEXT PRIMARY KEY,
            reason TEXT DEFAULT 'No reason provided',
            developer TEXT
        `
    },
    {
        name: 'prefixes',
        schema: `
            guildId TEXT PRIMARY KEY,
            prefix TEXT
        `
    },
    {
        name: 'rankPermissions',
        schema: `
            rank TEXT PRIMARY KEY,
            allowedCommands TEXT DEFAULT '[]',
            deniedCommands TEXT DEFAULT '[]'
        `
    },
    {
        name: 'ignorechannels',
        schema: `
            guildId TEXT,
            channelId TEXT,
            PRIMARY KEY (guildId, channelId)
        `
    },
    {
        name: 'userpreferences',
        schema: `
            userId TEXT PRIMARY KEY,
            musicSource TEXT DEFAULT 'ytmsearch'
        `
    },
    {
        name: 'setup',
        schema: `
            guildId TEXT PRIMARY KEY,
            channelId TEXT,
            messageId TEXT,
            voiceChannelId TEXT
        `
    },
    {
        name: 'twofourseven',
        schema: `
            guildId TEXT PRIMARY KEY,
            textId TEXT,
            voiceId TEXT
        `
    },
    {
        name: 'autorole',
        schema: `
            guildId TEXT PRIMARY KEY,
            roles TEXT DEFAULT '[]'
        `
    },
    {
        name: 'voicerole',
        schema: `
            guildId TEXT PRIMARY KEY,
            roleId TEXT,
            voiceChannelId TEXT
        `
    },
    {
        name: 'vcstatus',
        schema: `
            guildId TEXT PRIMARY KEY,
            status TEXT
        `
    },
    {
        name: 'reboot',
        schema: `
            id TEXT PRIMARY KEY,
            channelId TEXT,
            messageId TEXT,
            guildId TEXT
        `
    },
    {
        name: 'invitetracking',
        schema: `
            guildId TEXT PRIMARY KEY,
            enabled INTEGER DEFAULT 0,
            channelId TEXT
        `
    },
    {
        name: 'invites',
        schema: `
            guildId TEXT,
            userId TEXT,
            invites INTEGER DEFAULT 0,
            fake INTEGER DEFAULT 0,
            leaves INTEGER DEFAULT 0,
            bonus INTEGER DEFAULT 0,
            PRIMARY KEY (guildId, userId)
        `
    },
    {
        name: 'giveaways',
        schema: `
            messageId TEXT PRIMARY KEY,
            guildId TEXT,
            channelId TEXT,
            hostId TEXT,
            prize TEXT,
            winnerCount INTEGER,
            endTime INTEGER,
            ended INTEGER DEFAULT 0,
            participants TEXT DEFAULT '[]',
            createdAt INTEGER
        `
    },
    {
        name: 'invite_logs',
        schema: `
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT,
            userId TEXT,
            inviterId TEXT,
            inviteCode TEXT,
            joinedAt TEXT,
            leftAt TEXT,
            isLeft INTEGER DEFAULT 0,
            isFake INTEGER DEFAULT 0,
            isRejoin INTEGER DEFAULT 0,
            cleared INTEGER DEFAULT 0,
            clearedAt TEXT
        `
    },
    {
        name: 'automod',
        schema: `
            guildId TEXT PRIMARY KEY,
            antiLink INTEGER DEFAULT 0,
            antiInvite INTEGER DEFAULT 0,
            antiSpam INTEGER DEFAULT 0,
            antiMention INTEGER DEFAULT 0,
            antiCaps INTEGER DEFAULT 0,
            antiEmoji INTEGER DEFAULT 0,
            antiNsfw INTEGER DEFAULT 0,
            maxMentions INTEGER DEFAULT 5,
            maxEmoji INTEGER DEFAULT 10,
            whitelistRoles TEXT DEFAULT '[]',
            whitelistChannels TEXT DEFAULT '[]',
            whitelistUsers TEXT DEFAULT '[]',
            logChannel TEXT,
            action TEXT DEFAULT 'delete',
            heatSettings TEXT DEFAULT '{}',
            punishments TEXT DEFAULT '{}'
        `
    }
];

const ticketTables = [
  {
    name: 'ticket_guilds',
    schema: `
      guildId TEXT PRIMARY KEY,
      staffRoles TEXT DEFAULT '[]',
      blacklistedUsers TEXT DEFAULT '[]'
    `
  },
  {
    name: 'ticket_panels',
    schema: `
      panelId TEXT PRIMARY KEY,
      guildId TEXT NOT NULL,
      name TEXT DEFAULT 'Ticket Panel',
      channelId TEXT,
      messageId TEXT,
      panelMessage TEXT DEFAULT '{}',
      selectMenuConfig TEXT DEFAULT '{}',
      categories TEXT DEFAULT '[]',
      logs TEXT DEFAULT '{}',
      isActive INTEGER DEFAULT 1,
      createdAt TEXT
    `
  },
  {
    name: 'ticket_tickets',
    schema: `
      ticketId TEXT PRIMARY KEY,
      guildId TEXT NOT NULL,
      panelId TEXT,
      categoryId TEXT,
      channelId TEXT,
      userId TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      addedUsers TEXT DEFAULT '[]',
      removedUsers TEXT DEFAULT '[]',
      controlMessageId TEXT,
      closedBy TEXT,
      closedAt TEXT,
      closeReason TEXT,
      rating TEXT DEFAULT '{}',
      createdAt TEXT
    `
  }
];

const newTables = [
  {
    name: 'no_prefix_access',
    schema: `
      guild_id     TEXT PRIMARY KEY,
      granted_by   TEXT,
      method       TEXT,
      expires_at   INTEGER,
      active       INTEGER DEFAULT 1
    `
  },
  {
    name: 'invite_tracking',
    schema: `
      user_id      TEXT PRIMARY KEY,
      invite_code  TEXT,
      join_count   INTEGER DEFAULT 0,
      created_at   INTEGER
    `
  },
  {
    name: 'bot_verification',
    schema: `
      user_id      TEXT PRIMARY KEY,
      server1_id   TEXT,
      server2_id   TEXT,
      verified     INTEGER DEFAULT 0
    `
  },
  {
    name: 'developers',
    schema: `
      user_id      TEXT PRIMARY KEY,
      added_by     TEXT,
      added_at     INTEGER
    `
  }
];

const setupTables = [
  {
    name: 'noprefix_setup',
    schema: `
      guildId TEXT PRIMARY KEY,
      channelId TEXT,
      messageId TEXT
    `
  }
];

newTables.forEach(table => {
  db.prepare(`CREATE TABLE IF NOT EXISTS ${table.name} (${table.schema})`).run();
});

setupTables.forEach(table => {
  db.prepare(`CREATE TABLE IF NOT EXISTS ${table.name} (${table.schema})`).run();
});

tables.forEach(table => {
    db.prepare(`CREATE TABLE IF NOT EXISTS ${table.name} (${table.schema})`).run();

    if (table.name === 'profiles') {
        const columns = db.prepare('PRAGMA table_info(profiles)').all();
        const columnNames = columns.map(c => c.name);
        const required = ['rank', 'deniedCommands', 'allowedCommands'];
        required.forEach(col => {
            if (!columnNames.includes(col)) {
                const type = col === 'rank' ? 'TEXT DEFAULT "User"' : 'TEXT DEFAULT "[]"';
                db.prepare(`ALTER TABLE profiles ADD COLUMN ${col} ${type}`).run();
            }
        });
    }

    if (table.name === 'reboot') {
        const columns = db.prepare('PRAGMA table_info(reboot)').all();
        const columnNames = columns.map(c => c.name);
        if (!columnNames.includes('guildId')) {
            db.prepare('ALTER TABLE reboot ADD COLUMN guildId TEXT').run();
        }
    }

    if (table.name === 'automod') {
        const columns = db.prepare('PRAGMA table_info(automod)').all();
        const columnNames = columns.map(c => c.name);
        if (!columnNames.includes('punishments')) {
            db.prepare('ALTER TABLE automod ADD COLUMN punishments TEXT DEFAULT "{}"').run();
        }
        if (!columnNames.includes('heatSettings')) {
            db.prepare('ALTER TABLE automod ADD COLUMN heatSettings TEXT DEFAULT "{}"').run();
        }
        if (!columnNames.includes('maxEmoji')) {
            db.prepare('ALTER TABLE automod ADD COLUMN maxEmoji INTEGER DEFAULT 10').run();
        }
    }
});


ticketTables.forEach(table => {
  db.prepare(`CREATE TABLE IF NOT EXISTS ${table.name} (${table.schema})`).run();
});

const levelingTables = [
  {
    name: 'user_xp',
    schema: `
      guild_id TEXT,
      user_id TEXT,
      xp INTEGER DEFAULT 0,
      xp_user INTEGER DEFAULT 0,
      last_message_ts INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    `
  },
  {
    name: 'level_roles',
    schema: `
      guild_id TEXT,
      level INTEGER,
      role_id TEXT,
      PRIMARY KEY (guild_id, level)
    `
  },
  {
    name: 'xp_multipliers',
    schema: `
      guild_id TEXT,
      target_id TEXT,
      type TEXT CHECK(type IN ('channel', 'role', 'global')),
      multiplier REAL,
      PRIMARY KEY (guild_id, target_id, type)
    `
  },
  {
    name: 'no_xp_channels',
    schema: `
      guild_id TEXT,
      channel_id TEXT,
      PRIMARY KEY (guild_id, channel_id)
    `
  },
  {
    name: 'config',
    schema: `
      guild_id TEXT PRIMARY KEY,
      leveling_enabled INTEGER DEFAULT 1,
      xp_cooldown_seconds INTEGER DEFAULT 60,
      global_multiplier REAL DEFAULT 1.0,
      rankup_mode TEXT DEFAULT 'channel',
      rankup_channel TEXT,
      role_mode TEXT DEFAULT 'highest',
      levelup_message TEXT
    `
  },
  {
    name: 'xp_settings',
    schema: `
      guild_id TEXT PRIMARY KEY,
      leveling_enabled INTEGER DEFAULT 1
    `
  },
  {
    name: 'claimed_xp',
    schema: `
      guild_id TEXT,
      user_id TEXT,
      claimed INTEGER DEFAULT 1,
      PRIMARY KEY (guild_id, user_id)
    `
  },
  {
    name: 'leaderboard_data',
    schema: `
      guild_id TEXT NOT NULL,
      username TEXT NOT NULL,
      level INTEGER NOT NULL,
      xp INTEGER NOT NULL
    `
  },
  {
    name: 'global_settings',
    schema: `
      key TEXT PRIMARY KEY,
      value TEXT
    `
  }
];

levelingTables.forEach(table => {
  db.prepare(`CREATE TABLE IF NOT EXISTS ${table.name} (${table.schema})`).run();
});

const lvlCols = db.prepare('PRAGMA table_info(user_xp)').all();
const lvlColNames = lvlCols.map(c => c.name);
if (!lvlColNames.includes('xp_user')) {
  db.prepare('ALTER TABLE user_xp ADD COLUMN xp_user INTEGER DEFAULT 0').run();
}
if (!lvlColNames.includes('last_message_ts')) {
  db.prepare('ALTER TABLE user_xp ADD COLUMN last_message_ts INTEGER DEFAULT 0').run();
}

const xpsCols = db.prepare('PRAGMA table_info(xp_settings)').all();
const xpsColNames = xpsCols.map(c => c.name);
if (!xpsColNames.includes('role_mode')) {
  db.prepare("ALTER TABLE xp_settings ADD COLUMN role_mode TEXT DEFAULT 'highest'").run();
}

const cfgCols = db.prepare('PRAGMA table_info(config)').all();
const cfgColNames = cfgCols.map(c => c.name);
if (!cfgColNames.includes('levelup_message')) {
  db.prepare('ALTER TABLE config ADD COLUMN levelup_message TEXT').run();
}

const ticketIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_ticket_panels_guildId ON ticket_panels(guildId)',
  'CREATE INDEX IF NOT EXISTS idx_ticket_tickets_guildId ON ticket_tickets(guildId)',
  'CREATE INDEX IF NOT EXISTS idx_ticket_tickets_userId ON ticket_tickets(userId)',
  'CREATE INDEX IF NOT EXISTS idx_ticket_tickets_channelId ON ticket_tickets(channelId)',
  'CREATE INDEX IF NOT EXISTS idx_ticket_tickets_status ON ticket_tickets(status)'
];

ticketIndexes.forEach(index => {
  db.prepare(index).run();
});

const levelingIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_user_xp_guild_id ON user_xp(guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_user_xp_guild_id_xp ON user_xp(guild_id, xp DESC)',
  'CREATE INDEX IF NOT EXISTS idx_level_roles_guild_id ON level_roles(guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_xp_multipliers_guild_id ON xp_multipliers(guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_no_xp_channels_guild_id ON no_xp_channels(guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_claimed_xp_guild_id ON claimed_xp(guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_leaderboard_data_guild_id ON leaderboard_data(guild_id)'
];

levelingIndexes.forEach(index => {
  db.prepare(index).run();
});

const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_profiles_userId ON profiles(userId)',
    'CREATE INDEX IF NOT EXISTS idx_liked_userId ON liked(userId)',
    'CREATE INDEX IF NOT EXISTS idx_noprefix_userId_guildId ON noprefix(userId, guildId)',
    'CREATE INDEX IF NOT EXISTS idx_blacklist_userId ON blacklist(userId)',
    'CREATE INDEX IF NOT EXISTS idx_prefixes_guildId ON prefixes(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_ignorechannels_guildId ON ignorechannels(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_userpreferences_userId ON userpreferences(userId)',
    'CREATE INDEX IF NOT EXISTS idx_setup_guildId ON setup(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_twofourseven_guildId ON twofourseven(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_autorole_guildId ON autorole(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_voicerole_guildId ON voicerole(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_vcstatus_guildId ON vcstatus(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_invitetracking_guildId ON invitetracking(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_invite_logs_guildId ON invite_logs(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_invite_logs_userId ON invite_logs(userId)',
    'CREATE INDEX IF NOT EXISTS idx_giveaways_guildId ON giveaways(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_giveaways_ended ON giveaways(ended)',
    'CREATE INDEX IF NOT EXISTS idx_invites_guildId_userId ON invites(guildId, userId)'
];

indexes.forEach(index => {
    db.prepare(index).run();
});


const managers = {};

const createManager = (tableName, primaryKey = 'id') => {
    return {
        get: (pkValue) => {
            return db.prepare(`SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`).get(pkValue);
        },
        set: (pkValue, data) => {
            const updates = [];
            const params = [];
            for (const key in data) {
                if (key === primaryKey) continue;
                updates.push(`${key} = ?`);
                let val = data[key];
                if (typeof val === 'object' && val !== null) val = serialize(val);
                params.push(val);
            }

            const exists = db.prepare(`SELECT 1 FROM ${tableName} WHERE ${primaryKey} = ?`).get(pkValue);
            if (exists) {
                params.push(pkValue);
                db.prepare(`UPDATE ${tableName} SET ${updates.join(', ')} WHERE ${primaryKey} = ?`).run(...params);
            } else {
                const keys = [primaryKey, ...Object.keys(data).filter(k => k !== primaryKey)];
                const vals = keys.map(k => {
                    let v = k === primaryKey ? pkValue : data[k];
                    if (typeof v === 'object' && v !== null) v = serialize(v);
                    return v;
                });
                db.prepare(`INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
            }
        },
        delete: (pkValue) => {
            db.prepare(`DELETE FROM ${tableName} WHERE ${primaryKey} = ?`).run(pkValue);
        },
        getAll: () => {
            return db.prepare(`SELECT * FROM ${tableName}`).all();
        }
    };
};

const deserializeProfile = (row) => ({
    ...row,
    badges: deserialize(row.badges),
    friends: deserialize(row.friends),
    deniedCommands: deserialize(row.deniedCommands),
    allowedCommands: deserialize(row.allowedCommands)
});

managers.profiles = {
    get: (userId) => {
        const row = db.prepare('SELECT * FROM profiles WHERE userId = ?').get(userId);
        if (!row) return null;
        return deserializeProfile(row);
    },
    set: (userId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            if (key === 'userId') continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (['badges', 'friends', 'deniedCommands', 'allowedCommands'].includes(key)) val = serialize(val);
            params.push(val);
        }

        const exists = db.prepare('SELECT 1 FROM profiles WHERE userId = ?').get(userId);
        if (exists) {
            params.push(userId);
            db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE userId = ?`).run(...params);
        } else {
            const keys = ['userId', ...Object.keys(data).filter(k => k !== 'userId')];
            const vals = keys.map(k => {
                let v = k === 'userId' ? userId : data[k];
                if (['badges', 'friends', 'deniedCommands', 'allowedCommands'].includes(k)) v = serialize(v || []);
                return v;
            });
            db.prepare(`INSERT INTO profiles (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    },
    find: (filter = {}) => {
        let sql = 'SELECT * FROM profiles';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        return db.prepare(sql).all(...params).map(deserializeProfile);
    },
    deleteMany: (query) => {
        if (typeof query === 'string') {
            return db.prepare(query).run();
        }
        let sql = 'DELETE FROM profiles';
        const params = [];
        const conditions = [];
        for (const key in query || {}) {
            conditions.push(`${key} = ?`);
            params.push(query[key]);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
            return db.prepare(sql).run(...params);
        }
        return db.prepare(sql).run();
    }
};

managers.liked = {
    get: (userId) => {
        const row = db.prepare('SELECT * FROM liked WHERE userId = ?').get(userId);
        return row ? deserialize(row.songs) : [];
    },
    set: (userId, songs) => {
        db.prepare('INSERT OR REPLACE INTO liked (userId, songs) VALUES (?, ?)').run(userId, serialize(songs));
    }
};

managers.noprefix = {
    get: (userId, guildId = 'GLOBAL') => {
        const row = db.prepare('SELECT * FROM noprefix WHERE userId = ? AND guildId = ?').get(userId, guildId);
        if (!row) return null;
        return { ...row, noprefix: !!row.noprefix };
    },
    set: (userId, guildId, status, expiresAt = null) => {
        db.prepare('INSERT OR REPLACE INTO noprefix (userId, guildId, noprefix, expiresAt) VALUES (?, ?, ?, ?)').run(userId, guildId, status ? 1 : 0, expiresAt);
    },
    find: (filter = {}) => {
        let sql = 'SELECT * FROM noprefix';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        return db.prepare(sql).all(...params).map(row => ({ ...row, noprefix: !!row.noprefix }));
    },
    findOne: (filter = {}) => {
        let sql = 'SELECT * FROM noprefix';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        const row = db.prepare(sql).get(...params);
        if (!row) return null;
        return { ...row, noprefix: !!row.noprefix };
    },
    create: (data) => {
        const keys = Object.keys(data);
        const vals = keys.map(k => typeof data[k] === 'boolean' ? (data[k] ? 1 : 0) : (data[k] instanceof Date ? data[k].toISOString() : data[k]));
        db.prepare(`INSERT INTO noprefix (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
    },
    updateOne: (filter, data) => {
        let sql = 'UPDATE noprefix SET ';
        const updates = [];
        const params = [];
        for (const key in data) {
            updates.push(`${key} = ?`);
            params.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : (data[key] instanceof Date ? data[key].toISOString() : data[key]));
        }
        sql += updates.join(', ');
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        db.prepare(sql).run(...params);
    },
    deleteOne: (filter) => {
        let sql = 'DELETE FROM noprefix';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        db.prepare(sql).run(...params);
    },
    deleteMany: (filter) => {
        let sql = 'DELETE FROM noprefix';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        const res = db.prepare(sql).run(...params);
        return { deletedCount: res.changes };
    },
    findExpired: (now) => {
        return db.prepare('SELECT * FROM noprefix WHERE expiresAt IS NOT NULL AND expiresAt < ?').all(now);
    },
    delete: (id) => {
        db.prepare('DELETE FROM noprefix WHERE id = ?').run(id);
    },
    getGlobal: (userId) => {
        const row = db.prepare('SELECT * FROM noprefix WHERE userId = ? AND guildId = ? AND noprefix = 1').get(userId, 'GLOBAL');
        if (!row) return null;
        if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
            db.prepare('DELETE FROM noprefix WHERE id = ?').run(row.id);
            return null;
        }
        return { ...row, noprefix: !!row.noprefix };
    }
};

managers.blacklist = createManager('blacklist', 'userId');
managers.prefixes = createManager('prefixes', 'guildId');
managers.ignorechannels = {
    get: (guildId, channelId) => {
        return db.prepare('SELECT 1 FROM ignorechannels WHERE guildId = ? AND channelId = ?').get(guildId, channelId);
    },
    getForGuild: (guildId) => {
        return db.prepare('SELECT * FROM ignorechannels WHERE guildId = ?').all(guildId);
    },
    add: (guildId, channelId) => {
        db.prepare('INSERT OR IGNORE INTO ignorechannels (guildId, channelId) VALUES (?, ?)').run(guildId, channelId);
    },
    remove: (guildId, channelId) => {
        db.prepare('DELETE FROM ignorechannels WHERE guildId = ? AND channelId = ?').run(guildId, channelId);
    },
    deleteForGuild: (guildId) => {
        db.prepare('DELETE FROM ignorechannels WHERE guildId = ?').run(guildId);
    }
};
managers.userpreferences = createManager('userpreferences', 'userId');
managers.setup = createManager('setup', 'guildId');
managers.twofourseven = createManager('twofourseven', 'guildId');
managers.autorole = {
    get: (guildId) => {
        const row = db.prepare('SELECT * FROM autorole WHERE guildId = ?').get(guildId);
        if (!row) return null;
        return { ...row, roles: deserialize(row.roles) };
    },
    set: (guildId, roles) => {
        db.prepare('INSERT OR REPLACE INTO autorole (guildId, roles) VALUES (?, ?)').run(guildId, serialize(roles));
    },
    delete: (guildId) => {
        db.prepare('DELETE FROM autorole WHERE guildId = ?').run(guildId);
    }
};
managers.voicerole = createManager('voicerole', 'guildId');
managers.vcstatus = createManager('vcstatus', 'guildId');
managers.reboot = createManager('reboot', 'id');
managers.invitetracking = {
    get: (guildId) => {
        return db.prepare('SELECT * FROM invitetracking WHERE guildId = ?').get(guildId);
    },
    set: (guildId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            updates.push(`${key} = ?`);
            let val = data[key];
            if (typeof val === 'boolean') val = val ? 1 : 0;
            else if (typeof val === 'object' && val !== null) val = serialize(val);
            params.push(val);
        }
        params.push(guildId);
        const exists = db.prepare('SELECT 1 FROM invitetracking WHERE guildId = ?').get(guildId);
        if (exists) {
            db.prepare(`UPDATE invitetracking SET ${updates.join(', ')} WHERE guildId = ?`).run(...params);
        } else {
            const keys = ['guildId', ...Object.keys(data)];
            const vals = [guildId, ...Object.values(data).map(v => {
                if (typeof v === 'boolean') return v ? 1 : 0;
                if (typeof v === 'object' && v !== null) return serialize(v);
                return v;
            })];
            db.prepare(`INSERT INTO invitetracking (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    },
    delete: (guildId) => {
        db.prepare('DELETE FROM invitetracking WHERE guildId = ?').run(guildId);
    }
};

managers.invite_logs = {
    get: (guildId, userId) => {
        return db.prepare('SELECT * FROM invite_logs WHERE guildId = ? AND userId = ? ORDER BY joinedAt DESC LIMIT 1').get(guildId, userId);
    },
    find: (filter = {}) => {
        let sql = 'SELECT * FROM invite_logs';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            if (key === '$ne') continue;
            if (typeof filter[key] === 'object' && filter[key] !== null && filter[key].$ne !== undefined) {
                conditions.push(`${key} != ?`);
                params.push(filter[key].$ne === true ? 1 : (filter[key].$ne === false ? 0 : filter[key].$ne));
            } else {
                conditions.push(`${key} = ?`);
                params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
            }
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        return db.prepare(sql).all(...params);
    },
    create: (data) => {
        const keys = Object.keys(data);
        const vals = Object.values(data).map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
        db.prepare(`INSERT INTO invite_logs (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
    },
    count: (filter = {}) => {
        let sql = 'SELECT COUNT(*) as count FROM invite_logs';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        const res = db.prepare(sql).get(...params);
        return res ? res.count : 0;
    },
    deleteMany: (filter) => {
        let sql = 'DELETE FROM invite_logs';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
            db.prepare(sql).run(...params);
        }
    },
    updateMany: (filter = {}, data = {}) => {
        let sql = 'UPDATE invite_logs';
        const updates = [];
        const params = [];
        for (const key in data) {
            updates.push(`${key} = ?`);
            params.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
        }
        sql += ' SET ' + updates.join(', ');
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        return db.prepare(sql).run(...params);
    },
    update: (guildId, userId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            updates.push(`${key} = ?`);
            params.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
        }
        params.push(guildId, userId);
        db.prepare(`UPDATE invite_logs SET ${updates.join(', ')} WHERE guildId = ? AND userId = ?`).run(...params);
    }
};
managers.invites = {
    get: (guildId, userId) => {
        return db.prepare('SELECT * FROM invites WHERE guildId = ? AND userId = ?').get(guildId, userId);
    },
    set: (guildId, userId, data) => {
        const row = db.prepare('SELECT 1 FROM invites WHERE guildId = ? AND userId = ?').get(guildId, userId);
        if (row) {
            const updates = [];
            const params = [];
            for (const key in data) {
                updates.push(`${key} = ?`);
                let val = data[key];
                if (typeof val === 'boolean') val = val ? 1 : 0;
                else if (typeof val === 'object' && val !== null) val = serialize(val);
                params.push(val);
            }
            params.push(guildId, userId);
            db.prepare(`UPDATE invites SET ${updates.join(', ')} WHERE guildId = ? AND userId = ?`).run(...params);
        } else {
            const keys = ['guildId', 'userId', ...Object.keys(data)];
            const vals = [guildId, userId, ...Object.values(data).map(v => {
                if (typeof v === 'boolean') return v ? 1 : 0;
                if (typeof v === 'object' && v !== null) return serialize(v);
                return v;
            })];
            db.prepare(`INSERT INTO invites (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    }
};
managers.giveaways = {
    get: (messageId) => {
        const row = db.prepare('SELECT * FROM giveaways WHERE messageId = ?').get(messageId);
        if (!row) return null;
        return { ...row, participants: deserialize(row.participants) };
    },
    set: (messageId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            if (key === 'messageId') continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (typeof val === 'boolean') val = val ? 1 : 0;
            else if (typeof val === 'object' && val !== null) val = serialize(val);
            params.push(val);
        }

        const exists = db.prepare('SELECT 1 FROM giveaways WHERE messageId = ?').get(messageId);
        if (exists) {
            params.push(messageId);
            db.prepare(`UPDATE giveaways SET ${updates.join(', ')} WHERE messageId = ?`).run(...params);
        } else {
            const keys = ['messageId', ...Object.keys(data).filter(k => k !== 'messageId')];
            const vals = keys.map(k => {
                let v = k === 'messageId' ? messageId : data[k];
                if (typeof v === 'boolean') v = v ? 1 : 0;
                else if (typeof v === 'object' && v !== null) v = serialize(v || (k === 'participants' ? [] : {}));
                return v;
            });
            db.prepare(`INSERT INTO giveaways (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    },
    getAll: () => {
        return db.prepare('SELECT * FROM giveaways').all().map(row => ({ ...row, participants: deserialize(row.participants) }));
    },
    delete: (messageId) => {
        db.prepare('DELETE FROM giveaways WHERE messageId = ?').run(messageId);
    },
    find: (filter = {}, complex = null) => {
        let sql = 'SELECT * FROM giveaways';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (complex) {
            conditions.push(complex.condition);
            if (complex.params) params.push(...complex.params);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        return db.prepare(sql).all(...params).map(row => ({ ...row, participants: deserialize(row.participants) }));
    },
    deleteMany: (filter = {}, complex = null) => {
        let sql = 'DELETE FROM giveaways';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (complex) {
            conditions.push(complex.condition);
            if (complex.params) params.push(...complex.params);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
            return db.prepare(sql).run(...params);
        }
        return { changes: 0 };
    },
    getActiveForChannel: (channelId) => {
        return db.prepare('SELECT * FROM giveaways WHERE channelId = ? AND ended = 0').all(channelId).map(row => ({ ...row, participants: deserialize(row.participants) }));
    },
    getEndedForChannel: (channelId) => {
        return db.prepare('SELECT * FROM giveaways WHERE channelId = ? AND ended = 1').all(channelId).map(row => ({ ...row, participants: deserialize(row.participants) }));
    }
};

managers.rankPermissions = {
    get: (rank) => {
        const row = db.prepare('SELECT * FROM rankPermissions WHERE rank = ?').get(rank);
        if (!row) return { rank, allowedCommands: [], deniedCommands: [] };
        return {
            ...row,
            allowedCommands: deserialize(row.allowedCommands),
            deniedCommands: deserialize(row.deniedCommands)
        };
    },
    set: (rank, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            if (key === 'rank') continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (['allowedCommands', 'deniedCommands'].includes(key)) val = serialize(val);
            params.push(val);
        }

        const exists = db.prepare('SELECT 1 FROM rankPermissions WHERE rank = ?').get(rank);
        if (exists) {
            params.push(rank);
            db.prepare(`UPDATE rankPermissions SET ${updates.join(', ')} WHERE rank = ?`).run(...params);
        } else {
            const keys = ['rank', ...Object.keys(data).filter(k => k !== 'rank')];
            const vals = keys.map(k => {
                let v = k === 'rank' ? rank : data[k];
                if (['allowedCommands', 'deniedCommands'].includes(k)) v = serialize(v || []);
                return v;
            });
            db.prepare(`INSERT INTO rankPermissions (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    },
    deleteMany: (sql = 'DELETE FROM rankPermissions', params = []) => {
        db.prepare(sql).run(...params);
    }
};



managers.automod = {
    get: (guildId) => {
        const row = db.prepare('SELECT * FROM automod WHERE guildId = ?').get(guildId);
        if (!row) return null;
        return {
            ...row,
            antiLink: !!row.antiLink,
            antiInvite: !!row.antiInvite,
            antiSpam: !!row.antiSpam,
            antiMention: !!row.antiMention,
            antiCaps: !!row.antiCaps,
            antiEmoji: !!row.antiEmoji,
            antiNsfw: !!row.antiNsfw,
            whitelistRoles: deserialize(row.whitelistRoles),
            whitelistChannels: deserialize(row.whitelistChannels),
            whitelistUsers: deserialize(row.whitelistUsers),
            punishments: deserialize(row.punishments, {}),
            heatSettings: deserialize(row.heatSettings, {})
        };
    },
    set: (guildId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            if (key === 'guildId') continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (['whitelistRoles', 'whitelistChannels', 'whitelistUsers', 'punishments', 'heatSettings'].includes(key)) val = serialize(val);
            if (typeof val === 'boolean') val = val ? 1 : 0;
            params.push(val);
        }

        const exists = db.prepare('SELECT 1 FROM automod WHERE guildId = ?').get(guildId);
        if (exists) {
            params.push(guildId);
            db.prepare(`UPDATE automod SET ${updates.join(', ')} WHERE guildId = ?`).run(...params);
        } else {
            const keys = ['guildId', ...Object.keys(data).filter(k => k !== 'guildId')];
            const vals = keys.map(k => {
                let v = k === 'guildId' ? guildId : data[k];
                if (['whitelistRoles', 'whitelistChannels', 'whitelistUsers', 'punishments', 'heatSettings'].includes(k)) v = serialize(v || (k === 'punishments' || k === 'heatSettings' ? {} : []));
                if (typeof v === 'boolean') v = v ? 1 : 0;
                return v;
            });
            db.prepare(`INSERT INTO automod (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    }
};

const ticketHelpers = {
  serialize: (data) => JSON.stringify(data),
  deserialize: (data, fallback = null) => {
    try {
      if (!data) return fallback;
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      return fallback;
    }
  },
  generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
};

managers.ticketGuilds = {
  get: (guildId) => db.prepare('SELECT * FROM ticket_guilds WHERE guildId = ?').get(guildId),
  ensure: (guildId) => {
    let row = db.prepare('SELECT * FROM ticket_guilds WHERE guildId = ?').get(guildId);
    if (!row) {
      db.prepare('INSERT INTO ticket_guilds (guildId) VALUES (?)').run(guildId);
      row = { guildId, staffRoles: '[]', blacklistedUsers: '[]' };
    }
    return row;
  },
  getStaffRoles: (guildId) => {
    const row = db.prepare('SELECT staffRoles FROM ticket_guilds WHERE guildId = ?').get(guildId);
    return row ? ticketHelpers.deserialize(row.staffRoles, []) : [];
  },
  setStaffRoles: (guildId, roles) => {
    managers.ticketGuilds.ensure(guildId);
    db.prepare('UPDATE ticket_guilds SET staffRoles = ? WHERE guildId = ?').run(ticketHelpers.serialize(roles), guildId);
  },
  getBlacklistedUsers: (guildId) => {
    const row = db.prepare('SELECT blacklistedUsers FROM ticket_guilds WHERE guildId = ?').get(guildId);
    return row ? ticketHelpers.deserialize(row.blacklistedUsers, []) : [];
  },
  isUserBlacklisted: (guildId, userId) => {
    const users = managers.ticketGuilds.getBlacklistedUsers(guildId);
    return users.some(u => u.userId === userId);
  },
  addBlacklistedUser: (guildId, userId, reason, by) => {
    managers.ticketGuilds.ensure(guildId);
    const users = managers.ticketGuilds.getBlacklistedUsers(guildId);
    if (!users.some(u => u.userId === userId)) {
      users.push({ userId, reason: reason || null, blacklistedBy: by, blacklistedAt: new Date().toISOString() });
      db.prepare('UPDATE ticket_guilds SET blacklistedUsers = ? WHERE guildId = ?').run(ticketHelpers.serialize(users), guildId);
    }
  },
  removeBlacklistedUser: (guildId, userId) => {
    const users = managers.ticketGuilds.getBlacklistedUsers(guildId);
    const filtered = users.filter(u => u.userId !== userId);
    db.prepare('UPDATE ticket_guilds SET blacklistedUsers = ? WHERE guildId = ?').run(ticketHelpers.serialize(filtered), guildId);
  },
  delete: (guildId) => {
    db.prepare('DELETE FROM ticket_guilds WHERE guildId = ?').run(guildId);
  }
};

managers.ticketPanels = {
  get: (panelId) => {
    const row = db.prepare('SELECT * FROM ticket_panels WHERE panelId = ?').get(panelId);
    if (!row) return null;
    return {
      ...row,
      panelMessage: ticketHelpers.deserialize(row.panelMessage, {}),
      selectMenuConfig: ticketHelpers.deserialize(row.selectMenuConfig, {}),
      categories: ticketHelpers.deserialize(row.categories, []),
      logs: ticketHelpers.deserialize(row.logs, {}),
      isActive: !!row.isActive
    };
  },
  getGuildPanels: (guildId) => {
    const rows = db.prepare('SELECT * FROM ticket_panels WHERE guildId = ?').all(guildId);
    return rows.map(row => ({
      ...row,
      panelMessage: ticketHelpers.deserialize(row.panelMessage, {}),
      selectMenuConfig: ticketHelpers.deserialize(row.selectMenuConfig, {}),
      categories: ticketHelpers.deserialize(row.categories, []),
      logs: ticketHelpers.deserialize(row.logs, {}),
      isActive: !!row.isActive
    }));
  },
  create: (guildId, data = {}) => {
    const panelId = ticketHelpers.generateId();
    db.prepare('INSERT INTO ticket_panels (panelId, guildId, name, createdAt) VALUES (?, ?, ?, ?)').run(
      panelId, guildId, data.name || 'Ticket Panel', new Date().toISOString()
    );
    return managers.ticketPanels.get(panelId);
  },
  update: (panelId, data) => {
    const fields = [];
    const params = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'panelId') continue;
      if (['panelMessage', 'selectMenuConfig', 'categories', 'logs'].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(ticketHelpers.serialize(val));
      } else if (key === 'isActive') {
        fields.push(`${key} = ?`);
        params.push(val ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        params.push(val);
      }
    }
    if (fields.length > 0) {
      params.push(panelId);
      db.prepare(`UPDATE ticket_panels SET ${fields.join(', ')} WHERE panelId = ?`).run(...params);
    }
    return managers.ticketPanels.get(panelId);
  },
  delete: (panelId) => {
    db.prepare('DELETE FROM ticket_panels WHERE panelId = ?').run(panelId);
  },
  deleteByGuild: (guildId) => {
    db.prepare('DELETE FROM ticket_panels WHERE guildId = ?').run(guildId);
  },
  setPanelName: (panelId, name) => managers.ticketPanels.update(panelId, { name }),
  setPanelMessage: (panelId, msg) => managers.ticketPanels.update(panelId, { panelMessage: msg }),
  setPanelSelectMenu: (panelId, config) => {
    const panel = managers.ticketPanels.get(panelId);
    if (!panel) return;
    managers.ticketPanels.update(panelId, { selectMenuConfig: { ...panel.selectMenuConfig, ...config } });
  },
  setPanelMessageId: (panelId, channelId, messageId) => managers.ticketPanels.update(panelId, { channelId, messageId }),
  setPanelLogs: (panelId, logs) => managers.ticketPanels.update(panelId, { logs }),
  togglePanelActive: (panelId) => {
    const panel = managers.ticketPanels.get(panelId);
    if (panel) managers.ticketPanels.update(panelId, { isActive: !panel.isActive });
  },
  addCategory: (panelId, catData) => {
    const panel = managers.ticketPanels.get(panelId);
    if (!panel) return null;
    const cat = {
      categoryId: ticketHelpers.generateId(),
      name: catData.name || 'New Category',
      description: catData.description || null,
      emoji: catData.emoji || null,
      supportRoles: catData.supportRoles || [],
      ticketChannelCategory: catData.ticketChannelCategory || null,
      namingFormat: catData.namingFormat || 'ticket-{username}-{number}',
      settings: catData.settings || { pingUser: true, pingRole: false, userCanClose: false, dmUserOnOpen: false, dmUserOnClose: false, maxTicketsPerUser: 1, welcomeMessage: null },
      isActive: true
    };
    const cats = [...panel.categories, cat];
    db.prepare('UPDATE ticket_panels SET categories = ? WHERE panelId = ?').run(ticketHelpers.serialize(cats), panelId);
    return cat;
  },
  updateCategory: (panelId, categoryId, data) => {
    const panel = managers.ticketPanels.get(panelId);
    if (!panel) return;
    const cats = panel.categories.map(c => c.categoryId === categoryId ? { ...c, ...data } : c);
    db.prepare('UPDATE ticket_panels SET categories = ? WHERE panelId = ?').run(ticketHelpers.serialize(cats), panelId);
  },
  updateCategorySettings: (panelId, categoryId, settings) => {
    const panel = managers.ticketPanels.get(panelId);
    if (!panel) return;
    const cats = panel.categories.map(c =>
      c.categoryId === categoryId ? { ...c, settings: { ...c.settings, ...settings } } : c
    );
    db.prepare('UPDATE ticket_panels SET categories = ? WHERE panelId = ?').run(ticketHelpers.serialize(cats), panelId);
  },
  removeCategory: (panelId, categoryId) => {
    const panel = managers.ticketPanels.get(panelId);
    if (!panel) return;
    const cats = panel.categories.filter(c => c.categoryId !== categoryId);
    db.prepare('UPDATE ticket_panels SET categories = ? WHERE panelId = ?').run(ticketHelpers.serialize(cats), panelId);
  },
  toggleCategoryActive: (panelId, categoryId) => {
    const panel = managers.ticketPanels.get(panelId);
    if (!panel) return;
    const cats = panel.categories.map(c =>
      c.categoryId === categoryId ? { ...c, isActive: !c.isActive } : c
    );
    db.prepare('UPDATE ticket_panels SET categories = ? WHERE panelId = ?').run(ticketHelpers.serialize(cats), panelId);
  }
};

managers.ticketTickets = {
  get: (ticketId) => {
    const row = db.prepare('SELECT * FROM ticket_tickets WHERE ticketId = ?').get(ticketId);
    if (!row) return null;
    return {
      ...row,
      addedUsers: ticketHelpers.deserialize(row.addedUsers, []),
      removedUsers: ticketHelpers.deserialize(row.removedUsers, []),
      rating: ticketHelpers.deserialize(row.rating, {})
    };
  },
  getByChannel: (channelId) => {
    const row = db.prepare('SELECT * FROM ticket_tickets WHERE channelId = ?').get(channelId);
    if (!row) return null;
    return {
      ...row,
      addedUsers: ticketHelpers.deserialize(row.addedUsers, []),
      removedUsers: ticketHelpers.deserialize(row.removedUsers, []),
      rating: ticketHelpers.deserialize(row.rating, {})
    };
  },
  getByGuild: (guildId) => {
    const rows = db.prepare('SELECT * FROM ticket_tickets WHERE guildId = ?').all(guildId);
    return rows.map(row => ({
      ...row,
      addedUsers: ticketHelpers.deserialize(row.addedUsers, []),
      removedUsers: ticketHelpers.deserialize(row.removedUsers, []),
      rating: ticketHelpers.deserialize(row.rating, {})
    }));
  },
  getByUser: (guildId, userId) => {
    const rows = db.prepare('SELECT * FROM ticket_tickets WHERE guildId = ? AND userId = ?').all(guildId, userId);
    return rows.map(row => ({
      ...row,
      addedUsers: ticketHelpers.deserialize(row.addedUsers, []),
      removedUsers: ticketHelpers.deserialize(row.removedUsers, []),
      rating: ticketHelpers.deserialize(row.rating, {})
    }));
  },
  getUserOpenTickets: (guildId, userId, categoryId) => {
    const rows = db.prepare('SELECT * FROM ticket_tickets WHERE guildId = ? AND userId = ? AND categoryId = ? AND status = ?').all(guildId, userId, categoryId, 'open');
    return rows.map(row => ({
      ...row,
      addedUsers: ticketHelpers.deserialize(row.addedUsers, []),
      removedUsers: ticketHelpers.deserialize(row.removedUsers, []),
      rating: ticketHelpers.deserialize(row.rating, {})
    }));
  },
  create: (guildId, panelId, categoryId, userId) => {
    const ticketId = ticketHelpers.generateId();
    db.prepare('INSERT INTO ticket_tickets (ticketId, guildId, panelId, categoryId, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      ticketId, guildId, panelId, categoryId, userId, new Date().toISOString()
    );
    return managers.ticketTickets.get(ticketId);
  },
  update: (ticketId, data) => {
    const fields = [];
    const params = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === 'ticketId') continue;
      if (['addedUsers', 'removedUsers', 'rating'].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(ticketHelpers.serialize(val));
      } else {
        fields.push(`${key} = ?`);
        params.push(val);
      }
    }
    if (fields.length > 0) {
      params.push(ticketId);
      db.prepare(`UPDATE ticket_tickets SET ${fields.join(', ')} WHERE ticketId = ?`).run(...params);
    }
    return managers.ticketTickets.get(ticketId);
  },
  setChannel: (ticketId, channelId) => managers.ticketTickets.update(ticketId, { channelId }),
  setControlMessage: (ticketId, msgId) => managers.ticketTickets.update(ticketId, { controlMessageId: msgId }),
  close: (ticketId, closedBy, reason) => managers.ticketTickets.update(ticketId, { status: 'closed', closedBy, closedAt: new Date().toISOString(), closeReason: reason || null }),
  reopen: (ticketId) => managers.ticketTickets.update(ticketId, { status: 'open', closedBy: null, closedAt: null, closeReason: null }),
  addUser: (ticketId, userId, addedBy) => {
    const ticket = managers.ticketTickets.get(ticketId);
    if (!ticket) return;
    const users = ticket.addedUsers.filter(u => u.userId !== userId);
    users.push({ userId, addedBy, addedAt: new Date().toISOString() });
    managers.ticketTickets.update(ticketId, { addedUsers: users });
  },
  removeUser: (ticketId, userId, removedBy) => {
    const ticket = managers.ticketTickets.get(ticketId);
    if (!ticket) return;
    const added = ticket.addedUsers.filter(u => u.userId !== userId);
    const removed = [...(ticket.removedUsers || []), { userId, removedBy, removedAt: new Date().toISOString() }];
    managers.ticketTickets.update(ticketId, { addedUsers: added, removedUsers: removed });
  },
  isUserAdded: (ticketId, userId) => {
    const ticket = managers.ticketTickets.get(ticketId);
    return ticket ? ticket.addedUsers.some(u => u.userId === userId) : false;
  },
  getAddedUsers: (ticketId) => {
    const ticket = managers.ticketTickets.get(ticketId);
    return ticket ? ticket.addedUsers : [];
  },
  rate: (ticketId, stars, feedback) => {
    managers.ticketTickets.update(ticketId, { rating: { stars, feedback, ratedAt: new Date().toISOString() } });
  },
  delete: (ticketId) => {
    db.prepare('DELETE FROM ticket_tickets WHERE ticketId = ?').run(ticketId);
  },
  deleteByGuild: (guildId) => {
    db.prepare('DELETE FROM ticket_tickets WHERE guildId = ?').run(guildId);
  }
};

managers.leveling = {
  // Ported from Python: database.py XP functions

  updateXp(guildId, userId, xp, ts) {
    const existing = getStatement('SELECT 1 FROM user_xp WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (existing) {
      getStatement('UPDATE user_xp SET xp = xp + ?, last_message_ts = ? WHERE guild_id = ? AND user_id = ?').run(xp, ts, guildId, userId);
    } else {
      getStatement('INSERT INTO user_xp (guild_id, user_id, xp, last_message_ts) VALUES (?, ?, ?, ?)').run(guildId, userId, xp, ts);
    }
  },

  getXp(guildId, userId) {
    return getStatement('SELECT xp, xp_user, last_message_ts FROM user_xp WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  },

  setUserCustomXp(guildId, userId, xpAmount) {
    const existing = this.getXp(guildId, userId);
    if (existing) {
      getStatement('UPDATE user_xp SET xp = xp + ?, xp_user = xp_user + ? WHERE guild_id = ? AND user_id = ?').run(xpAmount, xpAmount, guildId, userId);
    } else {
      getStatement('INSERT INTO user_xp (guild_id, user_id, xp, xp_user) VALUES (?, ?, ?, ?)').run(guildId, userId, xpAmount, xpAmount);
    }
  },

  removeUserCustomXp(guildId, userId, xpAmount) {
    const existing = this.getXp(guildId, userId);
    if (existing) {
      const newXp = Math.max(0, existing.xp - xpAmount);
      const newXpUser = Math.max(0, existing.xp_user - xpAmount);
      getStatement('UPDATE user_xp SET xp = ?, xp_user = ? WHERE guild_id = ? AND user_id = ?').run(newXp, newXpUser, guildId, userId);
    }
  },

  getLeaderboard(guildId, limit = 10) {
    return getStatement('SELECT user_id, xp FROM user_xp WHERE guild_id = ? ORDER BY xp DESC LIMIT ?').all(guildId, limit);
  },

  getAllUserXp(guildId) {
    return getStatement('SELECT user_id, xp FROM user_xp WHERE guild_id = ? ORDER BY xp DESC').all(guildId);
  },

  getUserRank(guildId, userId) {
    const rows = getStatement('SELECT user_id FROM user_xp WHERE guild_id = ? ORDER BY xp DESC').all(guildId);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].user_id === userId) return i + 1;
    }
    return null;
  },

  resetUser(guildId, userId) {
    getStatement('DELETE FROM user_xp WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  },

  resetAllUsers(guildId) {
    getStatement('DELETE FROM user_xp WHERE guild_id = ?').run(guildId);
  },

  getConfig(guildId) {
    return getStatement('SELECT * FROM config WHERE guild_id = ?').get(guildId);
  },

  setConfig(guildId, data) {
    const existing = getStatement('SELECT 1 FROM config WHERE guild_id = ?').get(guildId);
    if (existing) {
      const updates = [];
      const params = [];
      for (const [key, val] of Object.entries(data)) {
        if (key === 'guild_id') continue;
        updates.push(`${key} = ?`);
        params.push(val);
      }
      params.push(guildId);
      getStatement(`UPDATE config SET ${updates.join(', ')} WHERE guild_id = ?`).run(...params);
    } else {
      const keys = ['guild_id', ...Object.keys(data)];
      const vals = [guildId, ...Object.values(data)];
      getStatement(`INSERT INTO config (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
    }
  },

  getXpSettings(guildId) {
    return getStatement('SELECT * FROM xp_settings WHERE guild_id = ?').get(guildId);
  },

  setXpSettings(guildId, data) {
    const existing = getStatement('SELECT 1 FROM xp_settings WHERE guild_id = ?').get(guildId);
    if (existing) {
      const updates = [];
      const params = [];
      for (const [key, val] of Object.entries(data)) {
        if (key === 'guild_id') continue;
        updates.push(`${key} = ?`);
        params.push(val);
      }
      params.push(guildId);
      getStatement(`UPDATE xp_settings SET ${updates.join(', ')} WHERE guild_id = ?`).run(...params);
    } else {
      const keys = ['guild_id', ...Object.keys(data)];
      const vals = [guildId, ...Object.values(data)];
      getStatement(`INSERT INTO xp_settings (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
    }
  },

  getLevelRoles(guildId) {
    return getStatement('SELECT level, role_id FROM level_roles WHERE guild_id = ? ORDER BY level ASC').all(guildId);
  },

  setLevelRole(guildId, level, roleId) {
    getStatement('INSERT INTO level_roles (guild_id, level, role_id) VALUES (?, ?, ?) ON CONFLICT(guild_id, level) DO UPDATE SET role_id = excluded.role_id').run(guildId, level, roleId);
  },

  removeLevelRole(guildId, level) {
    getStatement('DELETE FROM level_roles WHERE guild_id = ? AND level = ?').run(guildId, level);
  },

  getMultipliers(guildId) {
    return getStatement('SELECT * FROM xp_multipliers WHERE guild_id = ?').all(guildId);
  },

  getMultiplier(guildId, targetId, type) {
    return getStatement('SELECT multiplier FROM xp_multipliers WHERE guild_id = ? AND target_id = ? AND type = ?').get(guildId, targetId, type);
  },

  setMultiplier(guildId, targetId, type, multiplier) {
    getStatement('INSERT INTO xp_multipliers (guild_id, target_id, type, multiplier) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, target_id, type) DO UPDATE SET multiplier = excluded.multiplier').run(guildId, targetId, type, multiplier);
  },

  removeMultiplier(guildId, targetId, type) {
    getStatement('DELETE FROM xp_multipliers WHERE guild_id = ? AND target_id = ? AND type = ?').run(guildId, targetId, type);
  },

  getNoXpChannels(guildId) {
    return getStatement('SELECT channel_id FROM no_xp_channels WHERE guild_id = ?').all(guildId);
  },

  addNoXpChannel(guildId, channelId) {
    getStatement('INSERT OR IGNORE INTO no_xp_channels (guild_id, channel_id) VALUES (?, ?)').run(guildId, channelId);
  },

  removeNoXpChannel(guildId, channelId) {
    getStatement('DELETE FROM no_xp_channels WHERE guild_id = ? AND channel_id = ?').run(guildId, channelId);
  },

  getGlobalSetting(key, defaultVal = null) {
    const row = getStatement('SELECT value FROM global_settings WHERE key = ?').get(key);
    return row ? row.value : defaultVal;
  },

  setGlobalSetting(key, value) {
    getStatement('INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
  },

  isClaimed(guildId, userId) {
    return !!getStatement('SELECT 1 FROM claimed_xp WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  },

  setClaimed(guildId, userId) {
    getStatement('INSERT OR IGNORE INTO claimed_xp (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
  }
};

const Database = { db, ...managers };

module.exports = Database;
