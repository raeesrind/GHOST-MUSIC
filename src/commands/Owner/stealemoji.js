const { EmbedBuilder } = require('discord.js');
const {
  sanitizeName,
  uploadEmojiFromBuffer,
  makeEmbed,
  EMOJI_REGEX,
} = require('../../utils/emojiAPI');

const ALLOWED_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
const MAX_ITEMS = 5;

module.exports = {
  name: 'steal',
  description: 'Steal emojis/images from a replied message',
  category: 'Owner',
  owner: true,
  aliases: ['stealemoji', 'stealemojis'],
  async execute(message, args, client) {
    let targetMessage = null;

    if (message.reference?.messageId) {
      try {
        targetMessage = await message.channel.messages.fetch(message.reference.messageId);
      } catch { }
    }

    // Also check for a message link in args
    if (!targetMessage) {
      const link = args.find(a => a.startsWith('http'));
      if (link) {
        const parts = link.trim().split('/');
        const channelId = parts[parts.length - 2];
        const messageId = parts[parts.length - 1];
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel) targetMessage = await channel.messages.fetch(messageId);
        } catch { }
      }
    }

    if (!targetMessage) {
      return message.reply({ embeds: [makeEmbed('Reply to a message or provide a message link to steal its emojis.', 'error')] });
    }

    const emojis = [];

    const contentMatches = targetMessage.content.matchAll(EMOJI_REGEX);
    for (const match of contentMatches) {
      const [, animated, name, id] = match;
      const ext = animated === 'a' ? 'gif' : 'png';
      const url = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=128&quality=lossless`;
      emojis.push({ name, url, ext });
    }

    if (targetMessage.attachments.size > 0) {
      for (const attachment of targetMessage.attachments.values()) {
        const ext = attachment.name.split('.').pop().toLowerCase();
        if (ALLOWED_EXTS.includes(ext)) {
          const name = attachment.name.replace(/\.[^.]+$/, '');
          emojis.push({ name, url: attachment.url, ext });
        }
      }
    }

    if (!emojis.length) {
      return message.reply({ embeds: [makeEmbed('No custom emojis or image attachments found in that message.', 'error')] });
    }

    const results = { added: [], failed: [] };
    const toProcess = emojis.slice(0, MAX_ITEMS);

    for (const { name, url, ext } of toProcess) {
      try {
        const cleanName = sanitizeName(name);
        if (!cleanName) { results.failed.push(name); continue; }

        const res = await fetch(url);
        if (!res.ok) { results.failed.push(name); continue; }
        const buffer = Buffer.from(await res.arrayBuffer());

        const created = await uploadEmojiFromBuffer(client, cleanName, buffer, ext);
        const tag = created.animated ? `<a:${cleanName}:${created.id}>` : `<:${cleanName}:${created.id}>`;
        results.added.push(`${tag} **${cleanName}**`);
      } catch (err) {
        console.error(`[stealemoji] Failed to steal "${name}":`, err.message);
        results.failed.push(name);
      }
    }

    const lines = [];
    if (results.added.length) {
      lines.push(`✅ Added ${results.added.length} emoji${results.added.length > 1 ? 's' : ''}:`);
      lines.push(...results.added);
    }
    if (results.failed.length) {
      lines.push(`❌ Failed ${results.failed.length} emoji${results.failed.length > 1 ? 's' : ''}:`);
      lines.push(...results.failed.map(n => `\`${n}\``));
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x540000)
          .setDescription(`👻 **Steal Emojis**\n\n${lines.join('\n')}`),
      ],
    });
  },
};
