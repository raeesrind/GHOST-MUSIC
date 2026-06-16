const state = {
  bots: [
    { id: 1, name: 'Ghost-1', status: 'free', guildId: null, vcId: null },
    { id: 2, name: 'Ghost-2', status: 'free', guildId: null, vcId: null },
    { id: 3, name: 'Ghost-3', status: 'free', guildId: null, vcId: null },
  ],
  waitingQueue: [],
};

function getState() {
  return state;
}

function saveState() {
}

function getFreeBot() {
  return state.bots.find(b => b.status === 'free') || null;
}

function assignBot(id, guildId, vcId) {
  const bot = state.bots.find(b => b.id === id);
  if (bot) {
    bot.status = 'busy';
    bot.guildId = guildId;
    bot.vcId = vcId;
  }
}

function freeBot(id) {
  const bot = state.bots.find(b => b.id === id);
  if (bot) {
    bot.status = 'free';
    bot.guildId = null;
    bot.vcId = null;
  }
  return state;
}

function addToQueue(guildId, vcId, textChannelId, userId, prefix) {
  state.waitingQueue.push({ guildId, vcId, textChannelId, userId, prefix, timestamp: Date.now() });
  return state.waitingQueue.length;
}

function removeFromQueue(index) {
  if (index >= 0 && index < state.waitingQueue.length) {
    state.waitingQueue.splice(index, 1);
  }
}

function getNextInQueue() {
  return state.waitingQueue.length > 0 ? state.waitingQueue[0] : null;
}

module.exports = { getState, saveState, getFreeBot, assignBot, freeBot, addToQueue, removeFromQueue, getNextInQueue };

