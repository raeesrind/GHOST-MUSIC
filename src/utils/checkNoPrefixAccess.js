module.exports = (database, config) => {
  const db = database.db || database;

  function isOwner(userId) {
    return Array.isArray(config.OWNER_IDS) && config.OWNER_IDS.includes(userId);
  }

  function isDeveloper(userId) {
    const row = db.prepare(
      'SELECT 1 FROM developers WHERE user_id = ?'
    ).get(userId);
    return !!row;
  }

  function guildHasAccess(guildId) {
    const row = db.prepare(
      'SELECT * FROM no_prefix_access WHERE guild_id = ? AND active = 1'
    ).get(guildId);

    if (!row) return false;

    if (!row.expires_at) return true;

    if (Date.now() > row.expires_at) {
      db.prepare(
        'UPDATE no_prefix_access SET active = 0 WHERE guild_id = ?'
      ).run(guildId);
      return false;
    }

    return true;
  }

  function hasNoPrefixAccess(userId, guildId) {
    if (isOwner(userId)) return true;
    if (isDeveloper(userId)) return true;
    if (guildHasAccess(guildId)) return true;
    return false;
  }

  function grantAccess(guildId, grantedBy, method, days = null) {
    const expires = days ? Date.now() + days * 24 * 60 * 60 * 1000 : null;
    db.prepare(`
      INSERT INTO no_prefix_access (guild_id, granted_by, method, expires_at, active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(guild_id) DO UPDATE SET
        granted_by = excluded.granted_by,
        method     = excluded.method,
        expires_at = excluded.expires_at,
        active     = 1
    `).run(guildId, grantedBy, method, expires);
  }

  function revokeAccess(guildId) {
    db.prepare(
      'UPDATE no_prefix_access SET active = 0 WHERE guild_id = ?'
    ).run(guildId);
  }

  function getAccessInfo(guildId) {
    return db.prepare(
      'SELECT * FROM no_prefix_access WHERE guild_id = ?'
    ).get(guildId);
  }

  return {
    isOwner,
    isDeveloper,
    guildHasAccess,
    hasNoPrefixAccess,
    grantAccess,
    revokeAccess,
    getAccessInfo,
  };
};
