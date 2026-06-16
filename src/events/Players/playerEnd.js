const { EmbedBuilder } = require("discord.js");
const { updateVoiceChannel } = require("../../utils/voiceConnect");
const SmartAutoplayEngine = require("../../utils/SmartAutoplayEngine");

module.exports = {
  name: "playerEnd",
  run: async (client, player, track) => {
    try {
      if (track) {
        let history = player.data?.get("history") || [];
        if (history.length === 0 || history[history.length - 1]?.uri !== track.uri) {
          history.push({
            title: track.title,
            author: track.author,
            uri: track.uri,
            length: track.length,
            thumbnail: track.thumbnail,
            requester: track.requester,
            identifier: track.identifier,
            sourceName: track.sourceName
          });
          if (history.length > 20) history.shift();
          player.data?.set("history", history);
        }
      }

      const engine = SmartAutoplayEngine.getEngine(client, player);
      if (track) {
        engine.onTrackComplete(track);
      }

      player.data.get("message")?.delete().catch(() => null);
      await updateVoiceChannel(client, player, true);

      const guild = client.guilds.cache.get(player.guildId);
      if (!guild) return;

      if (player.queue && player.queue.size > 0) return;
      if (player.playing) return;

      const autoplay = player.data?.get("autoplay");
      if (autoplay && track) {
        const mode = engine.getMode();
        if (mode === "OFF") return;

        const history = player.data?.get("history") || [];
        const engines = _getSearchEngines(client, track);

        const recommendation = await engine.getNextTrack(track);

        if (!recommendation) {
          console.log(`[SmartAutoplay] No recommendations for: ${track.title}`);
          return;
        }

        const searchQuery = `${recommendation.author} ${recommendation.title}`;
        const nextTrack = await _findTrack(client, searchQuery, engines, history, track);

        if (!nextTrack) {
          console.log(`[SmartAutoplay] Could not load: ${searchQuery}`);
          return;
        }

        player.queue.add(nextTrack);
        if (!player.playing && !player.paused) await player.play();
      }
    } catch (error) {
      console.error("Error in playerEnd event:", error);
    }
  },
};

function _getSearchEngines(client, track) {
  let engines = ["ytmsearch", "ytsearch", "spsearch", "amsearch", "dzsearch", "jssearch", "gnsearch", "scsearch"];
  try {
    const userId = track.requester?.id || track.requester;
    const userPref = client.db.userpreferences.get(userId);
    if (userPref && userPref.musicSource) {
      engines = [userPref.musicSource, ...engines.filter(e => e !== userPref.musicSource)];
    }
  } catch (err) { }
  return engines;
}

function extractCoreName(title) {
  let core = title.toLowerCase();
  core = core.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '');
  core = core.replace(/official|video|audio|lyric|lyrics|music|song|full|hd|4k|8k|version|remix|edit|remaster/gi, '');
  core = core.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  return core;
}

function isSimilarTitle(title1, title2) {
  const core1 = extractCoreName(title1);
  const core2 = extractCoreName(title2);
  if (core1 === core2) return true;
  if (core1.length > 3 && core2.length > 3) {
    if (core1.includes(core2) || core2.includes(core1)) return true;
  }
  const words1 = core1.split(' ').filter(w => w.length > 2);
  const words2 = core2.split(' ').filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return core1 === core2;
  const commonWords = words1.filter(w => words2.includes(w));
  const similarity = commonWords.length / Math.max(words1.length, words2.length);
  return similarity > 0.6;
}

async function _findTrack(client, query, engines, history, currentTrack) {
  for (const engine of engines.slice(0, 2)) {
    try {
      const result = await client.manager.search(query, { engine, requester: client.user });
      if (result && result.tracks && result.tracks.length > 0) {
        const found = result.tracks.find(t => {
          const inHistory = history.some(h => h.uri === t.uri || h.identifier === t.identifier || isSimilarTitle(h.title, t.title));
          const isCurrent = t.uri === currentTrack.uri || t.identifier === currentTrack.identifier || isSimilarTitle(t.title, currentTrack.title);
          return !inHistory && !isCurrent;
        });
        if (found) return found;
      }
    } catch (e) { continue; }
  }
  return null;
}
