// Ported from Python: get_xp_for_level(level) = int(5 / 6 * level * (2 * level^2 + 27 * level + 91))
function getXpForLevel(level) {
    return Math.floor(5 / 6 * level * (2 * level ** 2 + 27 * level + 91));
}

// Ported from Python: iterative level calculation
function calculateLevel(xp) {
    let level = 0;
    while (getXpForLevel(level + 1) <= xp) {
        level++;
    }
    return level;
}

// Ported from Python: format_xp (leaderboard.py)
function formatXp(xp) {
    if (xp >= 1_000_000) {
        return `${(xp / 1_000_000).toFixed(1)}m`;
    } else if (xp >= 1_000) {
        return `${(xp / 1_000).toFixed(1)}k`;
    }
    return String(xp);
}

module.exports = { getXpForLevel, calculateLevel, formatXp };
