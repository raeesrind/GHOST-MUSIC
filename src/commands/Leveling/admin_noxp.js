const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

function reply(message, content) {
  const display = new TextDisplayBuilder().setContent(content);
  const container = new ContainerBuilder().addTextDisplayComponents(display);
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { roles: [] } });
}

function embedReply(message, emojiIcon, title, body) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emojiIcon} ${title}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { roles: [] } });
}

function isAdmin(member) {
  return member.permissions.has('Administrator');
}

function resolveChannel(message, arg) {
  if (!arg) return null;
  const id = arg.replace(/[<#>]/g, '');
  return message.guild.channels.cache.get(id) || null;
}

const cmdNoXpAdd = {
  name: 'noxpchannel',
  aliases: [],
  description: 'Block XP earning in a channel (admin)',
  category: 'Leveling',
  usage: '#channel',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const channel = resolveChannel(message, args[0]);
    if (!channel) return reply(message, `${message.client.emoji.cross} Usage: \`noxpchannel #channel\``);
    message.client.db.leveling.addNoXpChannel(message.guild.id, channel.id);
    embedReply(message, message.client.emoji.check, 'No-XP Channel Added', `Users will **not** earn XP in ${channel}.`);
  }
};

const cmdNoXpRemove = {
  name: 'remnoxpchannel',
  aliases: ['unenoxpchannel'],
  description: 'Re-enable XP earning in a channel (admin)',
  category: 'Leveling',
  usage: '#channel',
  userPerms: ['Administrator'],
  async execute(message, args) {
    if (!isAdmin(message.member)) return reply(message, `${message.client.emoji.cross} You need Administrator permission.`);
    const channel = resolveChannel(message, args[0]);
    if (!channel) return reply(message, `${message.client.emoji.cross} Usage: \`remnoxpchannel #channel\``);
    message.client.db.leveling.removeNoXpChannel(message.guild.id, channel.id);
    embedReply(message, message.client.emoji.check, 'No-XP Channel Removed', `XP earning **re-enabled** in ${channel}.`);
  }
};

const cmdNoXpList = {
  name: 'listnoxpchannels',
  aliases: ['noxplist'],
  description: 'List all channels where XP is blocked',
  category: 'Leveling',
  async execute(message) {
    const rows = message.client.db.leveling.getNoXpChannels(message.guild.id);
    if (!rows.length) return embedReply(message, message.client.emoji.cross, 'No-XP Channels', 'No channels are currently blocking XP.');

    const channels = rows.map(r => message.guild.channels.cache.get(r.channel_id)).filter(Boolean);
    const body = channels.map(c => c.toString()).join('\n');
    embedReply(message, message.client.emoji.check, 'No-XP Channels', body);
  }
};

module.exports = { all: [cmdNoXpAdd, cmdNoXpRemove, cmdNoXpList] };
