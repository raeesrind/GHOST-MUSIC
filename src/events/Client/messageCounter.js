const { messageCounts, messageBlacklist } = require('../../utils/newFeaturesDb');

module.exports = {
  name: 'messageCreate',
  run: async (client, message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (messageBlacklist.isBlacklisted(message.guild.id, message.channel.id)) return;

    messageCounts.increment(message.guild.id, message.author.id);
  }
};
