const LastFM = require("./lastfm");

const MOOD_VALUES = ["chill", "focus", "energetic", "melancholic"];

const TAG_MOOD_MAP = {
  chill: ["ambient", "chill", "chillout", "lounge", "downtempo", "relaxation", "sleep", "lofi", "lo-fi", "easy listening", "new age", "trip hop"],
  focus: ["classical", "study", "instrumental", "piano", "jazz", "guitar", "acoustic", "soundtrack", "ambient", "minimal"],
  energetic: ["rock", "metal", "dance", "edm", "electronic", "pop", "hip hop", "rap", "techno", "house", "drum and bass", "dubstep", "punk", "hardstyle", "trance"],
  melancholic: ["blues", "sad", "melancholic", "indie", "folk", "singer-songwriter", "country", "soul", "rnb", "ballad", "emo", "slow"]
};

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

class SmartAutoplayEngine {
  constructor(client, player) {
    this.client = client;
    this.player = player;
    this.lastfm = new LastFM(client);
    this._loadProfile();
    this.consecutiveSkips = 0;
    this.skipTimer = null;
    this._cachedCandidates = [];
    this._cachedCurrentKey = null;
    this._moodCache = new Map();
  }

  _loadProfile() {
    const saved = this.player.data.get("smartAutoplayProfile");
    if (saved) {
      this.profile = {
        genrePlayCount: saved.genrePlayCount || {},
        skippedTracks: new Set(saved.skippedTracks || []),
        lovedTracks: new Set(saved.lovedTracks || []),
        recentlyPlayed: saved.recentlyPlayed || [],
        avgListenPercent: saved.avgListenPercent || 100,
        totalTracksPlayed: saved.totalTracksPlayed || 0,
        totalListenPercent: saved.totalListenPercent || 0
      };
    } else {
      this.profile = {
        genrePlayCount: {},
        skippedTracks: new Set(),
        lovedTracks: new Set(),
        recentlyPlayed: [],
        avgListenPercent: 100,
        totalTracksPlayed: 0,
        totalListenPercent: 0
      };
    }
  }

  _saveProfile() {
    this.player.data.set("smartAutoplayProfile", {
      genrePlayCount: this.profile.genrePlayCount,
      skippedTracks: [...this.profile.skippedTracks],
      lovedTracks: [...this.profile.lovedTracks],
      recentlyPlayed: this.profile.recentlyPlayed,
      avgListenPercent: this.profile.avgListenPercent,
      totalTracksPlayed: this.profile.totalTracksPlayed,
      totalListenPercent: this.profile.totalListenPercent
    });
  }

  getTrackId(track) {
    return track.identifier || track.uri;
  }

  getCurrentMood() {
    return this.player.data.get("currentMood") || "focus";
  }

  setMood(mood) {
    if (MOOD_VALUES.includes(mood)) {
      this.player.data.set("currentMood", mood);
    }
  }

  getMode() {
    return this.player.data.get("autoplayMode") || "SMART";
  }

  isAutoplayEnabled() {
    return this.player.data.get("autoplay") || false;
  }

  _trackMoodCacheKey(track) {
    return `${track.author}|${track.title}`.toLowerCase();
  }

  async inferTrackMood(track) {
    const cacheKey = this._trackMoodCacheKey(track);
    if (this._moodCache.has(cacheKey)) {
      return this._moodCache.get(cacheKey);
    }

    const tags = await this._fetchTrackTags(track);
    let mood = null;

    if (tags.length > 0) {
      for (const [m, keywords] of Object.entries(TAG_MOOD_MAP)) {
        if (tags.some(tag => keywords.includes(tag.toLowerCase()))) {
          mood = m;
          break;
        }
      }
    }

    this._moodCache.set(cacheKey, mood);
    return mood;
  }

  async _fetchTrackTags(track) {
    try {
      const cleanAuthor = track.author.replace(/\s*-\s*Topic\s*$/i, '').trim();
      const cleanTitle = track.title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      const tags = await this.lastfm.getTrackTags(cleanAuthor, cleanTitle);
      return tags || [];
    } catch (e) {
      return [];
    }
  }

  _getTrackKey(track) {
    return `${track.author}|${extractCoreName(track.title)}`;
  }

  async getCachedOrFetchCandidates(currentTrack) {
    const key = this._getTrackKey(currentTrack);
    if (this._cachedCurrentKey === key && this._cachedCandidates.length > 0) {
      return this._cachedCandidates;
    }

    const candidates = await this._fetchCandidates(currentTrack);
    this._cachedCurrentKey = key;
    this._cachedCandidates = candidates;
    return candidates;
  }

  async _fetchCandidates(currentTrack) {
    const cleanAuthor = currentTrack.author.replace(/\s*-\s*Topic\s*$/i, '').trim();
    const cleanTitle = currentTrack.title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    let recommendations = [];

    try {
      recommendations = await this.lastfm.getSimilarTracks(cleanAuthor, cleanTitle, 15);

      if (recommendations.length === 0) {
        const similarArtists = await this.lastfm.getSimilarArtists(cleanAuthor, 3);
        for (const artist of similarArtists) {
          const artistTracks = await this.lastfm.getTopTracks(artist, 3);
          recommendations.push(...artistTracks);
        }
      }

      recommendations = recommendations.sort(() => Math.random() - 0.5);
    } catch (err) {
      console.warn("[SmartAutoplay] Last.fm fetch error:", err.message);
    }

    return recommendations;
  }

  async getNextTrack(currentTrack) {
    if (!this.isAutoplayEnabled()) return null;

    const mode = this.getMode();
    if (mode === "OFF") return null;

    const candidates = await this.getCachedOrFetchCandidates(currentTrack);
    if (candidates.length === 0) return null;

    const history = this.player.data.get("history") || [];

    if (mode === "SIMILAR") {
      return this._pickSimilarTrack(candidates, currentTrack, history);
    }

    if (mode === "DISCOVER") {
      const shouldDiscover = Math.random() < 0.2;
      if (shouldDiscover) {
        const discoverPick = this._pickDiscoverTrack(candidates, currentTrack, history);
        if (discoverPick) return discoverPick;
      }
    }

    return this._pickSmartTrack(candidates, currentTrack, history);
  }

  _pickSimilarTrack(candidates, currentTrack, history) {
    const deduped = candidates.filter(c => {
      const inHistory = history.some(h =>
        isSimilarTitle(h.title, c.title) && h.author === c.author
      );
      const isCurrent = isSimilarTitle(c.title, currentTrack.title) && c.author === currentTrack.author;
      return !inHistory && !isCurrent;
    });
    return deduped.length > 0 ? deduped[0] : null;
  }

  _pickDiscoverTrack(candidates, currentTrack, history) {
    const deduped = candidates.filter(c => {
      const inHistory = history.some(h =>
        isSimilarTitle(h.title, c.title) && h.author === c.author
      );
      const isCurrent = isSimilarTitle(c.title, currentTrack.title) && c.author === currentTrack.author;
      const inRecent = this.profile.recentlyPlayed.includes(c.title);
      return !inHistory && !isCurrent && !inRecent;
    });

    const lowSimilarity = deduped.filter(c => {
      const artistSimilar = c.author.toLowerCase() !== currentTrack.author.toLowerCase();
      const titleDiff = extractCoreName(c.title) !== extractCoreName(currentTrack.title);
      return artistSimilar && titleDiff;
    });

    const pool = lowSimilarity.length > 0 ? lowSimilarity : deduped;
    return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  async _pickSmartTrack(candidates, currentTrack, history) {
    const currentMood = this.getCurrentMood();

    const scored = await Promise.all(candidates.map(async (candidate) => {
      const score = await this._scoreCandidate(candidate, currentTrack, history, currentMood);
      return { candidate, score };
    }));

    scored.sort((a, b) => b.score - a.score);

    const topCandidates = scored.filter(s => s.score > 0);
    if (topCandidates.length === 0) {
      return scored.length > 0 ? scored[0].candidate : null;
    }

    return topCandidates[0].candidate;
  }

  async _scoreCandidate(candidate, currentTrack, history, currentMood) {
    const trackId = candidate.title + candidate.author;
    let score = 0;
    let totalWeight = 0;

    const genreMoodWeight = 0.4;
    const bpmWeight = 0.2;
    const recencyWeight = 0.2;
    const interactionWeight = 0.2;

    const genreMoodScore = await this._calcGenreMoodScore(candidate, currentTrack, currentMood);
    score += genreMoodScore * genreMoodWeight;
    totalWeight += genreMoodWeight;

    const bpmScore = this._calcBPMScore(candidate, currentTrack);
    score += bpmScore * bpmWeight;
    totalWeight += bpmWeight;

    const recencyScore = this._calcRecencyScore(candidate, history);
    score += recencyScore * recencyWeight;
    totalWeight += recencyWeight;

    const interactionScore = this._calcInteractionScore(candidate);
    score += interactionScore * interactionWeight;
    totalWeight += interactionWeight;

    if (totalWeight > 0) {
      score = score / totalWeight;
    }

    const inHistory = history.some(h =>
      isSimilarTitle(h.title, candidate.title) && h.author === candidate.author
    );
    if (inHistory) score *= 0.3;

    const inRecent = this.profile.recentlyPlayed.includes(trackId) ||
                     this.profile.recentlyPlayed.includes(candidate.title);
    if (inRecent) score *= 0.2;

    if (this.profile.skippedTracks.has(trackId)) {
      score *= 0.1;
    }

    if (this.profile.lovedTracks.has(trackId)) {
      score *= 1.5;
    }

    return Math.max(0, Math.min(100, score));
  }

  async _calcGenreMoodScore(candidate, currentTrack, currentMood) {
    let score = 50;

    const candidateMood = await this.inferTrackMood(candidate);
    const currentMoodInferred = await this.inferTrackMood(currentTrack);

    if (candidateMood && currentMood) {
      if (candidateMood === currentMood) {
        score = 100;
      } else {
        score = 30;
      }
    } else if (candidateMood && currentMoodInferred) {
      if (candidateMood === currentMoodInferred) {
        score = 85;
      } else {
        score = 40;
      }
    } else {
      const sameAuthor = candidate.author.toLowerCase() === currentTrack.author.toLowerCase();
      if (sameAuthor) score = 70;
    }

    return score;
  }

  _calcBPMScore(candidate, currentTrack) {
    return 50;
  }

  _calcRecencyScore(candidate, history) {
    const trackId = candidate.title + candidate.author;
    const recentIndex = this.profile.recentlyPlayed.indexOf(trackId);
    if (recentIndex === -1 && !history.some(h => isSimilarTitle(h.title, candidate.title))) {
      return 100;
    }
    if (recentIndex !== -1) {
      const recency = (10 - recentIndex) / 10;
      return Math.max(0, (1 - recency) * 30);
    }
    return 50;
  }

  _calcInteractionScore(candidate) {
    const trackId = candidate.title + candidate.author;
    let score = 50;

    if (this.profile.lovedTracks.has(trackId)) {
      score += 40;
    }

    if (this.profile.skippedTracks.has(trackId)) {
      score -= 40;
    }

    if (this.profile.totalTracksPlayed > 0) {
      const avgListen = this.profile.avgListenPercent;
      if (avgListen > 80) score += 10;
      else if (avgListen < 30) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  async getSmartQueuePreview(currentTrack, count = 3) {
    if (!this.isAutoplayEnabled() || this.getMode() === "OFF") return [];

    const candidates = await this.getCachedOrFetchCandidates(currentTrack);
    if (candidates.length === 0) return [];

    const history = this.player.data.get("history") || [];
    const currentMood = this.getCurrentMood();
    const mode = this.getMode();

    if (mode === "SIMILAR") {
      const picked = this._pickSimilarTrack(candidates, currentTrack, history);
      return picked ? [{ candidate: picked, reason: "similar vibe" }] : [];
    }

    const scored = await Promise.all(candidates.map(async (candidate) => {
      const score = await this._scoreCandidate(candidate, currentTrack, history, currentMood);
      return { candidate, score };
    }));

    scored.sort((a, b) => b.score - a.score);

    const top = scored.filter(s => s.score > 0);

    const deduped = [];
    const seen = new Set();
    for (const item of top) {
      const key = item.candidate.title + item.candidate.author;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
      if (deduped.length >= count) break;
    }

    return deduped.map((item, i) => {
      let reason = "similar vibe";
      if (i === 0 && item.score > 80) reason = "top pick";
      else if (this.profile.lovedTracks.has(item.candidate.title + item.candidate.author)) reason = "you might like";
      else if (this.profile.genrePlayCount[item.candidate.author] > 2) reason = "frequent artist";
      return { candidate: item.candidate, reason };
    });
  }

  onTrackStart(track) {
    this._loadProfile();
    this.profile.totalTracksPlayed++;
    const author = track.author.replace(/\s*-\s*Topic\s*$/i, '').trim();
    this.profile.genrePlayCount[author] = (this.profile.genrePlayCount[author] || 0) + 1;
    if (this.consecutiveSkips > 0) this.consecutiveSkips = 0;
    if (this.skipTimer) {
      clearTimeout(this.skipTimer);
      this.skipTimer = null;
    }
    this._saveProfile();
  }

  onTrackComplete(track) {
    this._loadProfile();
    const trackId = this.getTrackId(track);
    this.profile.recentlyPlayed.push(trackId);
    if (this.profile.recentlyPlayed.length > 10) {
      this.profile.recentlyPlayed.shift();
    }
    this._saveProfile();
  }

  onTrackSkip(track, positionMs) {
    this._loadProfile();
    const trackId = this.getTrackId(track);
    const duration = track.length || 0;
    const listenPercent = duration > 0 ? (positionMs / duration) * 100 : 0;

    this.profile.totalListenPercent += listenPercent;
    const played = this.profile.totalTracksPlayed || 1;
    this.profile.avgListenPercent = this.profile.totalListenPercent / played;

    if (listenPercent < 15) {
      this.profile.skippedTracks.add(trackId);
      this.consecutiveSkips++;
    } else if (listenPercent >= 60) {
      if (this.consecutiveSkips > 0) this.consecutiveSkips = 0;
    } else {
      this.consecutiveSkips++;
    }

    if (this.consecutiveSkips >= 3) {
      this._triggerMoodRecalibration();
      this.consecutiveSkips = 0;
    }

    if (this.skipTimer) {
      clearTimeout(this.skipTimer);
    }
    this.skipTimer = setTimeout(() => {
      this.consecutiveSkips = 0;
      this.skipTimer = null;
    }, 30000);

    this._saveProfile();
  }

  onTrackLike(track) {
    this._loadProfile();
    const trackId = this.getTrackId(track);
    this.profile.lovedTracks.add(trackId);
    this.profile.skippedTracks.delete(trackId);
    this._saveProfile();
  }

  onSeek(track, positionMs) {
  }

  _triggerMoodRecalibration() {
    console.log("[SmartAutoplay] Mood recalibration triggered after 3 consecutive skips");

    const moodCounts = {};
    this.profile.genrePlayCount = this.profile.genrePlayCount || {};

    let topGenre = null;
    let topCount = 0;
    for (const [genre, count] of Object.entries(this.profile.genrePlayCount)) {
      if (count > topCount) {
        topCount = count;
        topGenre = genre;
      }
    }

    const currentMood = this.getCurrentMood();
    const moodCycle = ["chill", "focus", "melancholic", "energetic"];
    const currentIndex = moodCycle.indexOf(currentMood);
    const newMood = moodCycle[(currentIndex + 1) % moodCycle.length];
    this.setMood(newMood);

    console.log(`[SmartAutoplay] Mood shifted: ${currentMood} -> ${newMood} (top genre: ${topGenre})`);

    this.player.data.set("moodRecalibrated", true);
    setTimeout(() => {
      this.player.data.set("moodRecalibrated", false);
    }, 120000);
  }

  resetSession() {
    this.profile = {
      genrePlayCount: {},
      skippedTracks: new Set(),
      lovedTracks: new Set(),
      recentlyPlayed: [],
      avgListenPercent: 100,
      totalTracksPlayed: 0,
      totalListenPercent: 0
    };
    this.consecutiveSkips = 0;
    this.setMood("focus");
    if (this.skipTimer) {
      clearTimeout(this.skipTimer);
      this.skipTimer = null;
    }
    this._saveProfile();
    this._cachedCandidates = [];
    this._cachedCurrentKey = null;
    this._moodCache.clear();
  }

  static getEngine(client, player) {
    let engine = player.data.get("smartAutoplayEngine");
    if (!engine) {
      engine = new SmartAutoplayEngine(client, player);
      player.data.set("smartAutoplayEngine", engine);
    }
    return engine;
  }
}

module.exports = SmartAutoplayEngine;
