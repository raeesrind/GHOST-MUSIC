const Database = require('better-sqlite3');
const path = require('path');

const GHOST_DB = path.resolve(process.argv[2] || 'data/ghost.db');
const MAIN_DB = path.resolve(process.cwd(), 'database.db');

const source = new Database(GHOST_DB, { readonly: true });
const target = new Database(MAIN_DB);

const tables = ['user_xp', 'level_roles', 'xp_multipliers', 'no_xp_channels', 'config', 'xp_settings', 'claimed_xp', 'leaderboard_data', 'global_settings'];

for (const table of tables) {
  const cols = source.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.length) {
    console.log(`  ⏭️  Table "${table}" not found in source — skipping`);
    continue;
  }

  const rows = source.prepare(`SELECT * FROM ${table}`).all();
  if (!rows.length) {
    console.log(`  ⏭️  Table "${table}" — 0 rows, nothing to migrate`);
    continue;
  }

  const colNames = cols.map(c => c.name);
  const placeholders = colNames.map(() => '?').join(', ');
  const insert = target.prepare(`INSERT OR IGNORE INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`);

  const insertMany = target.transaction((batch) => {
    for (const row of batch) {
      insert.run(...colNames.map(c => row[c]));
    }
  });

  insertMany(rows);
  console.log(`  ✅ Table "${table}" — ${rows.length} rows migrated`);
}

source.close();
target.close();

console.log('\nMigration complete. Start the bot and leveling data will be live.');
