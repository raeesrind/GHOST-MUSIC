const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const https = require('https');
const http = require('http');
const dns = require('dns');
const path = require('path');
const { getXpForLevel, calculateLevel } = require('../../utils/xpMath');

// ─── DNS resolver ─────────────────────────────────────────────────────────────
const dnsResolver = new dns.Resolver();
dnsResolver.setServers(['8.8.8.8', '1.1.1.1', '208.67.222.222']);

// ─── Asset paths ──────────────────────────────────────────────────────────────
const ASSETS_DIR = path.join(__dirname, '..', '..', '..', 'assets');
registerFont(path.join(ASSETS_DIR, 'fonts', 'ARIAL.TTF'), { family: 'Arial' });
const BG_PATH = path.join(ASSETS_DIR, 'rankghost.png');
const LOGO_PATH = path.join(ASSETS_DIR, 'ghost.png');

// ─── Module-level image cache ─────────────────────────────────────────────────
let _bgCache = null;
let _logoCache = null;
async function getBg() { if (!_bgCache) _bgCache = await loadImage(BG_PATH); return _bgCache; }
async function getLogo() { if (!_logoCache) _logoCache = await loadImage(LOGO_PATH); return _logoCache; }

// ─── Avatar fetcher (3-strategy fallback) ────────────────────────────────────
function fetchViaHttps(url) {
  const parsed = new URL(url);
  const lib = parsed.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    dnsResolver.resolve4(parsed.hostname, (err, addresses) => {
      if (err || !addresses?.length) return reject(err || new Error('DNS failed'));
      const opts = {
        host: addresses[0],
        port: parsed.protocol === 'https:' ? 443 : 80,
        path: parsed.pathname + parsed.search,
        headers: { Host: parsed.hostname, 'User-Agent': 'Mozilla/5.0 (compatible; GhostBot/2.0)' },
        servername: parsed.hostname,
        rejectUnauthorized: false,
      };
      lib.get(opts, (res) => {
        if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  });
}

async function fetchAvatar(user) {
  if (!user || typeof user.displayAvatarURL !== 'function') return null;
  const url = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });

  // Strategy 1: direct loadImage
  try {
    const img = await Promise.race([
      loadImage(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Avatar timeout')), 5000)
      )
    ]);
    console.log('[Avatar] Strategy 1 succeeded');
    return img;
  } catch (e) { console.warn('[Avatar] Strategy 1 failed:', e.message); }

  // Strategy 2: manual HTTPS + custom DNS
  try {
    const buf = await fetchViaHttps(url);
    const img = await loadImage(buf);
    console.log('[Avatar] Strategy 2 succeeded');
    return img;
  } catch (e) { console.warn('[Avatar] Strategy 2 failed:', e.message); }

  console.warn('[Avatar] All strategies failed — rendering without avatar');
  return null;
}

// ─── Dominant color ───────────────────────────────────────────────────────────
// Ported from Python: ColorThief.get_color(quality=1)
// Returns [r, g, b] — falls back to Discord blurple on any failure
function getDominantColor(img) {
  if (!img || !img.width || !img.height) return [88, 101, 242];
  try {
    const size = 50;
    const c = createCanvas(size, size);
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0, size, size);

    const pixels = cx.getImageData(0, 0, size, size).data; // Uint8ClampedArray — flat RGBA
    if (!pixels || pixels.length === 0) return [88, 101, 242];

    const buckets = new Map();
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
      if (a < 128) continue;                    // skip transparent
      if (r < 30 && g < 30 && b < 30) continue; // skip near-black
      if (r > 220 && g > 220 && b > 220) continue; // skip near-white
      const key = `${r >> 5},${g >> 5},${b >> 5}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    if (buckets.size === 0) return [88, 101, 242];

    let maxCount = 0, bestKey = null;
    for (const [key, count] of buckets) {
      if (count > maxCount) { maxCount = count; bestKey = key; }
    }
    if (!bestKey) return [88, 101, 242];

    const parts = bestKey.split(',').map(Number);
    return [
      Math.min(255, (parts[0] << 5) + 16),
      Math.min(255, (parts[1] << 5) + 16),
      Math.min(255, (parts[2] << 5) + 16),
    ];
  } catch (e) {
    console.warn('[getDominantColor] failed:', e.message);
    return [88, 101, 242];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
  return text + '…';
}

// ─── Card generator ───────────────────────────────────────────────────────────
async function generateRankCard(guildId, target, client) {
  console.time('RANK_CARD');
  const data = client.db.leveling.getXp(guildId, target.id);
  const currentXp = data ? data.xp : 0;
  const level = calculateLevel(currentXp);
  const nextLevelXp = getXpForLevel(level + 1);
  const prevLevelXp = getXpForLevel(level);
  const xpIntoLevel = currentXp - prevLevelXp;
  const xpNeeded = nextLevelXp - prevLevelXp;
  const rank = client.db.leveling.getUserRank(guildId, target.id);

  // Resolve user object safely (target may be GuildMember or User)
  const userObj = target.user ?? target ?? null;
  const avatarImg = await fetchAvatar(userObj);

  // ── Compute dominant color ONCE — reused everywhere ──────────────────────────
  const [domR, domG, domB] = getDominantColor(avatarImg);
  console.log(`[Rank] Color: rgb(${domR},${domG},${domB}) | Avatar: ${avatarImg ? 'OK' : 'MISSING'}`);

  // ── Canvas setup ──────────────────────────────────────────────────────────────
  const canvas = createCanvas(800, 250);
  const ctx = canvas.getContext('2d');

  // ── Background ────────────────────────────────────────────────────────────────
  const base = await getBg();
  ctx.drawImage(base, 0, 0, 800, 250);

  ctx.globalAlpha = 0.95;
  ctx.drawImage(base, 0, 0, 800, 250);
  ctx.globalAlpha = 1;

  // ── Dynamic tint (gradient left→right, stronger near avatar) ─────────────────
  // Ported from Python: tint overlay with avatar dominant color
  const grad = ctx.createLinearGradient(0, 0, 800, 0);
  grad.addColorStop(0, `rgba(${domR},${domG},${domB},0.55)`);
  grad.addColorStop(0.5, `rgba(${domR},${domG},${domB},0.30)`);
  grad.addColorStop(1, `rgba(${domR},${domG},${domB},0.08)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 250);

  // ── Avatar glow ring ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(110, 125, 84, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${domR},${domG},${domB},0.85)`;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // ── Circular avatar (or placeholder) ─────────────────────────────────────────
  // Ported from Python: circular avatar at center (110, 125), radius 80
  ctx.save();
  ctx.beginPath();
  ctx.arc(110, 125, 80, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, 30, 45, 160, 160);
  } else {
    ctx.fillStyle = 'rgba(80,80,80,0.8)';
    ctx.fill();
  }
  ctx.restore();

  // Placeholder '?' when no avatar
  if (!avatarImg) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 64px Arial';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('?', 110, 125);
    ctx.textAlign = 'left';
  }

  ctx.textBaseline = 'top';

  // ── Username ──────────────────────────────────────────────────────────────────
  // Ported from Python: member.name at (210, 40), font bold 32
  ctx.fillStyle = 'white';
  ctx.font = 'bold 32px Arial';
  ctx.fillText(fitText(ctx, userObj.username, 460), 210, 40);

  // ── Level + Rank ──────────────────────────────────────────────────────────────
  // Ported from Python: LEVEL at (210, 85), RANK at (360, 85), font 24
  ctx.font = '24px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`LEVEL ${level}`, 210, 85);
  ctx.fillText(`RANK #${rank || '?'}`, 360, 85);

  // ── Progress bar ──────────────────────────────────────────────────────────────
  // Ported from Python: bar at (210, 130), 500×26, radius 13
  const barX = 210, barY = 130, barW = 500, barH = 26;
  const progress = xpNeeded > 0
    ? Math.max(0, Math.min(barW, Math.floor((xpIntoLevel / xpNeeded) * barW)))
    : 0;

  // Bar track
  ctx.fillStyle = 'rgba(80,80,80,0.7)';
  roundRect(ctx, barX, barY, barW, barH, 13);
  ctx.fill();

  // Bar fill — gradient using dominant color
  if (progress > 0) {
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, `rgba(${domR},${domG},${domB},1)`);
    barGrad.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = barGrad;
    roundRect(ctx, barX, barY, progress, barH, 13);
    ctx.fill();
  }

  // ── XP text ───────────────────────────────────────────────────────────────────
  // Ported from Python: XP text right-aligned inside bar, font 18
  const xpText = `${xpIntoLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`;
  ctx.font = '18px Arial';
  ctx.fillStyle = progress > barW * 0.6 ? 'black' : 'white';
  ctx.textBaseline = 'top';
  const textW = ctx.measureText(xpText).width;
  ctx.fillText(xpText, barX + barW - textW - 10, barY + 4);

  // ── Ghost logo ────────────────────────────────────────────────────────────────
  try {
    const logo = await getLogo();
    ctx.drawImage(logo, canvas.width - 70, canvas.height - 70, 60, 60);
  } catch { console.warn('[Rank] Logo not found, skipping'); }

  console.timeEnd('RANK_CARD');
  console.time('BUFFER');
  const buffer = canvas.toBuffer('image/jpeg', {
    quality: 0.92
  });
  console.timeEnd('BUFFER');
  return buffer;
}

// ─── Command export ───────────────────────────────────────────────────────────
module.exports = {
  name: 'rank',
  aliases: ['level', 'lvl'],
  description: "Check your or another user's level and XP.",
  category: 'Leveling',
  args: false,
  usage: '[@user]',

  async execute(message, args) {
    let target = message.mentions.members.first();
    if (!target && args[0]) {
        try {
            const user = await message.client.users.fetch(args[0]);
            target = await message.guild.members.fetch(user.id).catch(() => null);
        } catch {
            target = message.guild.members.cache.find(m =>
                m.user.username.toLowerCase() === args.join(' ').toLowerCase() ||
                m.displayName.toLowerCase() === args.join(' ').toLowerCase()
            ) || null;
        }
    }
    if (!target) target = message.member;
    const guildId = message.guild.id;
    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

    const data = message.client.db.leveling.getXp(guildId, target.id);
    if (!data || data.xp === 0) {
      const display = new TextDisplayBuilder().setContent(`${message.client.emoji.cross} ${target} has no XP yet.`);
      const container = new ContainerBuilder().addTextDisplayComponents(display);
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    try {
      const buf = await generateRankCard(guildId, target, message.client);
      const attachment = new AttachmentBuilder(buf, { name: `rank-${target.id}-${Date.now()}.jpg` });
      await message.reply({ files: [attachment] });
    } catch (err) {
      console.error('[Rank Generation Error]', err);
      const display = new TextDisplayBuilder().setContent(`${message.client.emoji.cross} Failed to generate rank card: \`${err.message}\``);
      const container = new ContainerBuilder().addTextDisplayComponents(display);
      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  },

  async slashExecute(interaction, client) {
    const target = interaction.options.getMember('member') || interaction.member;
    const guildId = interaction.guild.id;
    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

    await interaction.deferReply();

    const data = client.db.leveling.getXp(guildId, target.id);
    if (!data || data.xp === 0) {
      const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} ${target} has no XP yet.`);
      const container = new ContainerBuilder().addTextDisplayComponents(display);
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    try {
      const buf = await generateRankCard(guildId, target, client);
      const attachment = new AttachmentBuilder(buf, { name: `rank-${target.id}-${Date.now()}.jpg` });
      console.time('EDIT_REPLY');
      await interaction.editReply({ files: [attachment] });
      console.timeEnd('EDIT_REPLY');
    } catch (err) {
      console.error('[Rank Generation Error]', err);
      const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Failed to generate rank card: \`${err.message}\``);
      const container = new ContainerBuilder().addTextDisplayComponents(display);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  },
};