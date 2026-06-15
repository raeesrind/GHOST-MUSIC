const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { SUPPORT_SERVER_ID, NO_PREFIX_DAYS } = require("../../config");
const buildChecker = require("../../utils/checkNoPrefixAccess");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    if (!member || !member.guild) return;

    try {
      const autoRoleData = client.db.autorole.get(member.guild.id);
      if (autoRoleData && autoRoleData.roles.length > 0) {
        for (const roleId of autoRoleData.roles) {
          const role = member.guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.add(role).catch(() => { });
          }
        }
      }

      const trackingEnabled = client.db.invitetracking.get(member.guild.id);

      if (trackingEnabled && trackingEnabled.status === 1) {

        if (member.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await trackInvite(client, member);
        }
      }

    } catch (error) {
      console.error("Error in guildMemberAdd event:", error);
    }

    if (member.guild.id === SUPPORT_SERVER_ID) {
      await handleSupportServerJoin(client, member);
    }
  },
};

async function handleSupportServerJoin(client, member) {
  const oldInvites = client.supportInviteCache?.get(member.guild.id) || new Map();

  let newInvites;
  try {
    newInvites = await member.guild.invites.fetch();
  } catch {
    return;
  }

  if (!client.supportInviteCache) client.supportInviteCache = new Map();
  client.supportInviteCache.set(
    member.guild.id,
    new Map(newInvites.map(inv => [inv.code, inv.uses]))
  );

  const usedInvite = newInvites.find(inv => {
    const oldUses = oldInvites.get(inv.code) || 0;
    return inv.uses > oldUses;
  });

  if (!usedInvite) return;

  const row = client.db.prepare(
    'SELECT * FROM invite_tracking WHERE invite_code = ?'
  ).get(usedInvite.code);

  if (!row) return;

  const newCount = row.join_count + 1;
  client.db.prepare(
    'UPDATE invite_tracking SET join_count = ? WHERE user_id = ?'
  ).run(newCount, row.user_id);

  if (newCount >= 3) {
    const checker = buildChecker(client.db, client.config);
    checker.grantAccess(row.user_id, row.user_id, 'invite', NO_PREFIX_DAYS);

    const user = await client.users.fetch(row.user_id).catch(() => null);
    if (user) {
      user.send(
        `🎉 **No-Prefix Access Granted!**\n` +
        `Your server now has **no-prefix access for ${NO_PREFIX_DAYS} days!**\n` +
        `Use commands without the \`,\` prefix — enjoy! 🚀`
      ).catch(() => {});
    }
  }
}

async function trackInvite(client, member) {
  try {
    await new Promise(resolve => setTimeout(resolve, 500));

    const newInvites = await member.guild.invites.fetch().catch(() => null);
    if (!newInvites) return;

    const cachedInvites = client.invites?.get(member.guild.id);
    let usedInvite = null;
    let inviter = null;

    if (!cachedInvites) {
      client.invites = client.invites || new Map();
      const inviteCache = new Map();
      newInvites.forEach(invite => {
        inviteCache.set(invite.code, {
          uses: invite.uses,
          inviter: invite.inviter
        });
      });
      client.invites.set(member.guild.id, inviteCache);
    } else {
      for (const [code, newInvite] of newInvites) {
        const cachedInvite = cachedInvites.get(code);

        if (!cachedInvite) {
          if (newInvite.uses > 0) {
            usedInvite = newInvite;
            inviter = newInvite.inviter;
            break;
          }
        } else if (newInvite.uses > cachedInvite.uses) {
          usedInvite = newInvite;
          inviter = newInvite.inviter;
          break;
        }
      }

      const inviteCache = new Map();
      newInvites.forEach(invite => {
        inviteCache.set(invite.code, {
          uses: invite.uses,
          inviter: invite.inviter
        });
      });
      client.invites.set(member.guild.id, inviteCache);
    }

    const accountAge = Date.now() - member.user.createdTimestamp;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const isFake = accountAge < sevenDays;

    const previousJoin = client.db.invite_logs.get(member.guild.id, member.user.id);

    let isRejoin = false;
    if (previousJoin) {
      const tenDays = 10 * 24 * 60 * 60 * 1000;
      const timeSinceLastJoin = Date.now() - new Date(previousJoin.joinedAt).getTime();
      isRejoin = timeSinceLastJoin <= tenDays;
    }

    if (!inviter) {
      return;
    }

    client.db.invite_logs.create({
      guildId: member.guild.id,
      userId: member.user.id,
      inviterId: inviter.id,
      inviteCode: usedInvite.code,
      joinedAt: new Date().toISOString(),
      isLeft: 0,
      isFake: isFake ? 1 : 0,
      isRejoin: isRejoin ? 1 : 0
    });

  } catch (error) {
    console.error("Error tracking invite:", error);
  }
}
