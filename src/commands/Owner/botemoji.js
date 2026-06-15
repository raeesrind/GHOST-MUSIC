const { EmbedBuilder } = require('discord.js');
const {
  sanitizeName,
  fetchAllEmojis,
  makeEmbed,
  emojiFromMessageLink,
  uploadEmojiFromBuffer,
  APP_ID,
} = require('../../utils/emojiAPI');

// Match custom Discord emoji: <a:name:id> or <:name:id>
const CUSTOM_EMOJI_RE = /^<(a?):(\w+):(\d+)>$/;

// Safe reply — falls back to channel.send if the original message was deleted
async function safeReply(message, payload) {
  try {
    return await message.reply(payload);
  } catch (err) {
    // 50035 = Invalid Form Body (includes MESSAGE_REFERENCE_UNKNOWN_MESSAGE)
    if (err.code === 50035 || err.code === 10008) {
      return message.channel.send(payload).catch(() => null);
    }
    throw err;
  }
}

// ─── Help ───────────────────────────────────────────────
function showHelp(message, prefix) {
  const p = prefix || '.';
  const desc = [
    '**Commands:**',
    `\`${p}be list\` — List app emojis`,
    `\`${p}be add\` — Add emoji (attachment, message link, or custom emoji)`,
    `\`${p}be remove <name>\` — Remove emoji by name`,
    `\`${p}be rename <old> <new>\` — Rename emoji`,
    `\`${p}steal\` — Steal emojis/images from a replied message`,
    '',
    '**Aliases (skip the subcommand):**',
    `\`${p}bel\` → list`,
    `\`${p}bea\` → add`,
    `\`${p}ber\` → remove`,
    `\`${p}bern\` → rename`,
    '',
    '**Add Methods:**',
    '• Upload an **image attachment**',
    '• Provide a **message link** containing a custom emoji',
    '• Paste a **custom emoji** directly (e.g. `<:name:123>`)',
    '',
    '**Limits:**',
    '• Max size: **256 KB**',
    '• Formats: `PNG` / `JPG` / `GIF` / `WEBP`',
    '• Name: alphanumeric + `_` only, max 32 chars',
  ].join('\n');

  return safeReply(message, {
    embeds: [new EmbedBuilder().setColor(0x540000).setDescription(`👻 **Bot Emoji Manager**\n\n${desc}`)],
  });
}

// ─── List ───────────────────────────────────────────────
async function listEmojis(message, client) {
  try {
    const emojis = await fetchAllEmojis(client);
    if (!emojis.length) {
      return safeReply(message, { embeds: [makeEmbed('No bot emojis found.', 'error')] });
    }

    const lines = emojis.map(e => {
      const tag = e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`;
      return `${tag} **${e.name}** \`${e.id}\``;
    });

    // Discord embed description limit is 4096 chars — chunk if needed
    const chunks = [];
    let current = '';
    for (const line of lines) {
      if ((current + '\n' + line).length > 3900) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }
    if (current) chunks.push(current);

    for (let i = 0; i < chunks.length; i++) {
      const embed = new EmbedBuilder()
        .setColor(0x540000)
        .setDescription(
          `👻 **Bot Emojis** (${emojis.length} total)` +
          `${chunks.length > 1 ? ` — Page ${i + 1}/${chunks.length}` : ''}\n\n${chunks[i]}`
        );
      if (i === 0) await safeReply(message, { embeds: [embed] });
      else await message.channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('[botemoji_list] Error:', err.message);
    return safeReply(message, { embeds: [makeEmbed(`Failed: ${err.message}`, 'error')] });
  }
}

// ─── Add ────────────────────────────────────────────────
async function addEmoji(message, args, client) {
  const attachment = message.attachments.first();

  // Check args for a custom emoji like <:name:123> or <a:name:456>
  const emojiArg = args.find(a => CUSTOM_EMOJI_RE.test(a));
  // Check args for a message link
  const messageLink = args.find(a => a.startsWith('http'));
  // Custom name = any arg that isn't a link, emoji ref, or raw :name:
  const nameOpt = args.find(
    a => !a.startsWith('http') && !CUSTOM_EMOJI_RE.test(a) && !/^:[\w]+:$/.test(a)
  );

  if (!attachment && !messageLink && !emojiArg) {
    return safeReply(message, {
      embeds: [makeEmbed('Attach an image, provide a **message link**, or paste a **custom emoji**.', 'error')],
    });
  }

  try {
    let emojiName = nameOpt || null;
    let buffer = null;
    let ext = 'png';

    if (attachment) {
      // ── Path 1: image attachment ──
      ext = attachment.name.split('.').pop().toLowerCase();
      const allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      if (!allowed.includes(ext)) {
        return safeReply(message, { embeds: [makeEmbed('Unsupported format. Use PNG, JPG, GIF, or WEBP.', 'error')] });
      }
      if (attachment.size > 256 * 1024) {
        return safeReply(message, { embeds: [makeEmbed('Image exceeds **256 KB** limit.', 'error')] });
      }

      const res = await fetch(attachment.url);
      if (!res.ok) {
        return safeReply(message, { embeds: [makeEmbed('Failed to download attachment.', 'error')] });
      }
      buffer = Buffer.from(await res.arrayBuffer());
      if (!emojiName) emojiName = attachment.name.replace(/\.[^.]+$/, '');

    } else if (emojiArg) {
      // ── Path 2: direct custom emoji (<:name:id> or <a:name:id>) ──
      const match = emojiArg.match(CUSTOM_EMOJI_RE);
      if (!match) {
        return safeReply(message, { embeds: [makeEmbed('Invalid emoji format.', 'error')] });
      }

      const [, animated, name, id] = match;
      ext = animated === 'a' ? 'gif' : 'png';
      const url = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=128&quality=lossless`;

      const res = await fetch(url);
      if (!res.ok) {
        return safeReply(message, { embeds: [makeEmbed('Failed to download emoji image from CDN.', 'error')] });
      }
      buffer = Buffer.from(await res.arrayBuffer());
      if (!emojiName) emojiName = name;

    } else {
      // ── Path 3: message link ──
      const result = await emojiFromMessageLink(client, messageLink);
      if (!result) {
        return safeReply(message, { embeds: [makeEmbed('No custom emoji found in that message.', 'error')] });
      }
      buffer = result.buffer;
      ext = result.ext;
      if (!emojiName) emojiName = result.name;
    }

    // Sanitize and validate name
    emojiName = sanitizeName(emojiName);
    if (!emojiName) {
      return safeReply(message, {
        embeds: [makeEmbed('Invalid emoji name — must contain at least one alphanumeric character or underscore.', 'error')],
      });
    }

    // Upload via shared utility (handles data URI + MIME normalization)
    const created = await uploadEmojiFromBuffer(client, emojiName, buffer, ext);
    const tag = created.animated
      ? `<a:${emojiName}:${created.id}>`
      : `<:${emojiName}:${created.id}>`;

    return safeReply(message, { embeds: [makeEmbed(`Added bot emoji ${tag} **${emojiName}**`, 'success')] });
  } catch (err) {
    console.error('[botemoji_add] Error:', err.message);
    return safeReply(message, { embeds: [makeEmbed(`Error: ${err.message}`, 'error')] });
  }
}

// ─── Remove ─────────────────────────────────────────────
async function removeEmoji(message, args, client, prefix) {
  const name = args[0];
  const p = prefix || '.';
  if (!name) {
    return safeReply(message, { embeds: [makeEmbed(`Usage: \`${p}ber <name>\` or \`${p}be remove <name>\``, 'error')] });
  }

  try {
    const emojis = await fetchAllEmojis(client);
    const emoji = emojis.find(e => e.name === name);
    if (!emoji) {
      return safeReply(message, { embeds: [makeEmbed(`Emoji \`${name}\` not found.`, 'error')] });
    }

    const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/emojis/${emoji.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${client.token}` },
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.text();
      return safeReply(message, { embeds: [makeEmbed(`Failed to remove emoji: ${err}`, 'error')] });
    }

    return safeReply(message, { embeds: [makeEmbed(`Removed bot emoji **${name}**`, 'success')] });
  } catch (err) {
    console.error('[botemoji_remove] Error:', err.message);
    return safeReply(message, { embeds: [makeEmbed(`Error: ${err.message}`, 'error')] });
  }
}

// ─── Rename ─────────────────────────────────────────────
async function renameEmoji(message, args, client, prefix) {
  const [oldName, ...rest] = args;
  const p = prefix || '.';
  if (!oldName || !rest.length) {
    return safeReply(message, {
      embeds: [makeEmbed(`Usage: \`${p}bern <old_name> <new_name>\` or \`${p}be rename <old> <new>\``, 'error')],
    });
  }
  const newName = sanitizeName(rest.join('_'));
  if (!newName) {
    return safeReply(message, {
      embeds: [makeEmbed('Invalid new name — must contain at least one alphanumeric character or underscore.', 'error')],
    });
  }

  try {
    const emojis = await fetchAllEmojis(client);
    const emoji = emojis.find(e => e.name === oldName);
    if (!emoji) {
      return safeReply(message, { embeds: [makeEmbed(`Emoji \`${oldName}\` not found.`, 'error')] });
    }

    const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/emojis/${emoji.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${client.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) {
      const err = await res.text();
      return safeReply(message, { embeds: [makeEmbed(`Failed to rename emoji: ${err}`, 'error')] });
    }

    return safeReply(message, { embeds: [makeEmbed(`Renamed **${oldName}** → **${newName}**`, 'success')] });
  } catch (err) {
    console.error('[botemoji_rename] Error:', err.message);
    return safeReply(message, { embeds: [makeEmbed(`Error: ${err.message}`, 'error')] });
  }
}

// ─── Main execute — routes by alias ─────────────────────
module.exports = {
  name: 'botemoji',
  description: 'Bot emoji manager — add, list, remove, rename app emojis',
  category: 'Owner',
  owner: true,
  aliases: ['be', 'bel', 'bea', 'ber', 'bern'],

  async execute(message, args, client, prefix) {
    // Use the resolved guild prefix (passed by messageCreate handler),
    // falling back to client.prefix for safety.
    const p = prefix || client.prefix || '.';

    // Determine which alias was used by parsing from message content
    // with the *actual* prefix length (not client.prefix which may differ).
    const usedCmd = message.content.slice(p.length).trim().split(/ +/)[0]?.toLowerCase();

    switch (usedCmd) {
      case 'bel':
        return listEmojis(message, client);
      case 'bea':
        return addEmoji(message, args, client);
      case 'ber':
        return removeEmoji(message, args, client, p);
      case 'bern':
        return renameEmoji(message, args, client, p);
      default: {
        // .be / .botemoji — route by first arg as subcommand
        const sub = args[0]?.toLowerCase();
        if (sub === 'list' || sub === 'l') return listEmojis(message, client);
        if (sub === 'add' || sub === 'a') return addEmoji(message, args.slice(1), client);
        if (sub === 'remove' || sub === 'rm' || sub === 'del') return removeEmoji(message, args.slice(1), client, p);
        if (sub === 'rename' || sub === 'rn') return renameEmoji(message, args.slice(1), client, p);
        return showHelp(message, p);
      }
    }
  },
};
