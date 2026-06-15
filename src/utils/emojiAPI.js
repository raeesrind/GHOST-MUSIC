const { EmbedBuilder } = require('discord.js');

const APP_ID = '1510944374513471489';
const EMOJI_REGEX = /<(a?):(\w+):(\d+)>/g;
const API_BASE = 'https://discord.com/api/v10';

function sanitizeName(name) {
  return name.replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 32);
}

async function fetchAllEmojis(client) {
  const res = await fetch(`${API_BASE}/applications/${APP_ID}/emojis`, {
    headers: { Authorization: `Bot ${client.token}` },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.items || [];
}

function makeEmbed(text, type = 'info') {
  const prefixes = {
    success: '✅ ',
    error: '❌ ',
    info: '👻 ',
  };
  return new EmbedBuilder()
    .setColor(0x540000)
    .setDescription(`${prefixes[type] || '👻 '}${text}`);
}

async function uploadEmojiFromBuffer(client, name, buffer, ext) {
  // Normalize MIME type: 'jpg' → 'jpeg' for valid data URI
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const image = `data:image/${mime};base64,${buffer.toString('base64')}`;
  const res = await fetch(`${API_BASE}/applications/${APP_ID}/emojis`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${client.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, image }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }
  return res.json();
}

async function uploadEmojiFromURL(client, name, url, ext) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return uploadEmojiFromBuffer(client, name, buffer, ext);
}

async function fetchMessageFromLink(client, link) {
  const parts = link.trim().split('/');
  const channelId = parts[parts.length - 2];
  const messageId = parts[parts.length - 1];

  const channel = await client.channels.fetch(channelId);
  if (!channel) return null;

  const message = await channel.messages.fetch(messageId);
  return message || null;
}

async function emojiFromMessageLink(client, link) {
  try {
    const message = await fetchMessageFromLink(client, link);
    if (!message) return null;

    const match = message.content.match(/<(a?):(\w+):(\d+)>/);
    if (!match) return null;

    const [, animated, name, id] = match;
    const ext = animated === 'a' ? 'gif' : 'png';
    const url = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=128&quality=lossless`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());

    return { name, buffer, ext };
  } catch (err) {
    console.error('[emojiFromMessageLink] Error:', err.message);
    return null;
  }
}

module.exports = {
  APP_ID,
  API_BASE,
  EMOJI_REGEX,
  sanitizeName,
  fetchAllEmojis,
  makeEmbed,
  uploadEmojiFromBuffer,
  uploadEmojiFromURL,
  fetchMessageFromLink,
  emojiFromMessageLink,
};
