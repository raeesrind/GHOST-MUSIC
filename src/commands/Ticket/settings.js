const {
  PermissionFlagsBits,
  MessageFlags,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder
} = require("discord.js");
const emoji = require("../../emojis");

const state = {};

module.exports = {
  name: 'tsettings',
  category: 'Ticket',
  description: 'Configure ticket system settings',
  aliases: ['ticketsettings'],
  usage: 'tsettings',
  userPerms: [PermissionFlagsBits.ManageGuild],
  slashOptions: [],
  async slashExecute(interaction, client) {
    return this.execute(interaction, [], client, '/');
  },
  async execute(message, args, client, prefix) {
    const db = client.db;
    state[message.guild.id] = { view: "MAIN", temp: {}, page: 0 };
    const c = await this._render(message, state[message.guild.id], db);
    const msg = await message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    this._collector(message, msg, db);
  },
  async _render(ctx, st, db) {
    if (st.view === "MAIN") return await this._main(ctx, st, db);
    if (st.view === "STAFF") return await this._staff(ctx, st, db);
    if (st.view === "BLACKLIST") return await this._blacklist(ctx, st, db);
    if (st.view === "GUIDE") return this._guide(ctx, st);
    return this._msg("Error", "Unknown view");
  },
  async _main(ctx, st, db) {
    const guild = db.ticketGuilds.ensure(ctx.guild.id);
    const staffRoles = db.ticketGuilds.getStaffRoles(ctx.guild.id);
    const blacklisted = db.ticketGuilds.getBlacklistedUsers(ctx.guild.id);
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## ${emoji.settings} Ticket Settings\n\n**Staff Roles:** ${staffRoles.length} configured\n**Blacklisted Users:** ${blacklisted.length} users`
    ));
    c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    c.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ts_staff").setLabel("Staff Roles").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ts_blacklist").setLabel("Blacklist").setStyle(ButtonStyle.Danger)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ts_guide").setLabel("View Guide").setStyle(ButtonStyle.Success)
      )
    );
    return c;
  },
  async _staff(ctx, st, db) {
    const staffRoles = db.ticketGuilds.getStaffRoles(ctx.guild.id);
    const rolesText = staffRoles.length ? staffRoles.map(r => `<@&${r}>`).join(" ") : "No staff roles configured";
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.settings} Staff Roles\n\n${rolesText}\n\n${staffRoles.length}/10 roles configured`));
    c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder().setCustomId("ts_staff_select").setPlaceholder("Select staff roles (up to 10)").setMinValues(0).setMaxValues(10)
    ));
    c.addSeparatorComponents(new SeparatorBuilder());
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ts_back").setLabel("Back").setStyle(ButtonStyle.Secondary)
    ));
    return c;
  },
  async _blacklist(ctx, st, db) {
    const blacklisted = db.ticketGuilds.getBlacklistedUsers(ctx.guild.id);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(Math.max(blacklisted.length, 1) / itemsPerPage);
    const currentPage = st.page || 0;
    const startIdx = currentPage * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, blacklisted.length);
    const pageItems = blacklisted.slice(startIdx, endIdx);

    let listText = blacklisted.length === 0 ? "No blacklisted users" : "";
    for (const bl of pageItems) {
      listText += `<@${bl.userId}> - ${bl.reason || "No reason"}\n`;
    }
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.lock} Blacklisted Users\n\nPage ${currentPage + 1}/${totalPages}\n\n${listText}`));
    c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ts_bl_add").setLabel("Add User").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("ts_bl_remove").setLabel("Remove User").setStyle(ButtonStyle.Success).setDisabled(blacklisted.length === 0)
    ));
    c.addSeparatorComponents(new SeparatorBuilder());
    const navRow = new ActionRowBuilder();
    if (currentPage > 0) navRow.addComponents(new ButtonBuilder().setCustomId("ts_bl_prev").setLabel("Previous").setStyle(ButtonStyle.Secondary));
    if (currentPage < totalPages - 1 && blacklisted.length > itemsPerPage) navRow.addComponents(new ButtonBuilder().setCustomId("ts_bl_next").setLabel("Next").setStyle(ButtonStyle.Secondary));
    navRow.addComponents(new ButtonBuilder().setCustomId("ts_back").setLabel("Back").setStyle(ButtonStyle.Secondary));
    c.addActionRowComponents(navRow);
    return c;
  },
  _guide(ctx, st) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## ${emoji.ticket} Settings Guide\n\n**Staff Roles**\nUsers with staff roles have elevated permissions across all tickets:\n${emoji.check} Close any ticket\n${emoji.check} Delete any ticket\n${emoji.check} Add/remove users from tickets\n${emoji.check} Reopen closed tickets\n\n**Staff Roles vs Support Roles**\nStaff roles are server-wide and work on all tickets. Support roles are category-specific and only grant access to tickets in their assigned categories.\n\n**Blacklist**\nBlacklisted users cannot create new tickets. Existing tickets remain accessible but no new tickets can be opened.`
    ));
    c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ts_back").setLabel("Back").setStyle(ButtonStyle.Secondary)
    ));
    return c;
  },
  _msg(title, text) {
    return new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}\n\n${text}`));
  },
  async _update(ctx, msg, st, db) {
    try {
      await msg.edit({ components: [await this._render(ctx, st, db)], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {}
  },
  _collector(ctx, msg, db) {
    const col = msg.createMessageComponentCollector({ filter: i => i.user.id === ctx.author.id, time: 600000 });
    const st = state[ctx.guild.id];
    col.on("collect", async i => {
      try {
        const id = i.customId;
        if (id === "ts_back") { await i.deferUpdate(); st.view = "MAIN"; st.page = 0; await this._update(ctx, msg, st, db); return; }
        if (id === "ts_staff") { await i.deferUpdate(); st.view = "STAFF"; await this._update(ctx, msg, st, db); return; }
        if (id === "ts_staff_select") { await i.deferUpdate(); db.ticketGuilds.setStaffRoles(ctx.guild.id, i.values); await this._update(ctx, msg, st, db); return; }
        if (id === "ts_blacklist") { await i.deferUpdate(); st.view = "BLACKLIST"; st.page = 0; await this._update(ctx, msg, st, db); return; }
        if (id === "ts_guide") { await i.deferUpdate(); st.view = "GUIDE"; await this._update(ctx, msg, st, db); return; }
        if (id === "ts_bl_add") {
          const modal = new ModalBuilder().setCustomId(`ts_bl_add_${i.id}`).setTitle("Blacklist User");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("userId").setLabel("User ID").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Reason (optional)").setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(false))
          );
          await i.showModal(modal);
          try { const sub = await i.awaitModalSubmit({ filter: s => s.customId === `ts_bl_add_${i.id}`, time: 120000 }); await sub.deferUpdate(); const userId = sub.fields.getTextInputValue("userId").trim(); const reason = sub.fields.getTextInputValue("reason")?.trim() || null; db.ticketGuilds.addBlacklistedUser(ctx.guild.id, userId, reason, ctx.author.id); await this._update(ctx, msg, st, db); } catch (e) {}
          return;
        }
        if (id === "ts_bl_remove") {
          const blacklisted = db.ticketGuilds.getBlacklistedUsers(ctx.guild.id);
          const opts = blacklisted.map(bl => ({ label: bl.userId, value: bl.userId, description: bl.reason?.substring(0, 100) || "No reason" }));
          await i.deferUpdate();
          const c = new ContainerBuilder();
          c.addTextDisplayComponents(new TextDisplayBuilder().setContent("## Remove from Blacklist\n\nSelect user to remove"));
          c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
          c.addActionRowComponents(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId("ts_bl_remove_select").setPlaceholder("Select user to remove").addOptions(opts)
          ));
          c.addSeparatorComponents(new SeparatorBuilder());
          c.addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ts_bl_remove_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
          ));
          await msg.edit({ components: [c], flags: MessageFlags.IsComponentsV2 });
          return;
        }
        if (id === "ts_bl_remove_select") { await i.deferUpdate(); db.ticketGuilds.removeBlacklistedUser(ctx.guild.id, i.values[0]); st.page = 0; await this._update(ctx, msg, st, db); return; }
        if (id === "ts_bl_remove_cancel") { await i.deferUpdate(); await this._update(ctx, msg, st, db); return; }
        if (id === "ts_bl_prev") { await i.deferUpdate(); if (st.page > 0) st.page--; await this._update(ctx, msg, st, db); return; }
        if (id === "ts_bl_next") { await i.deferUpdate(); st.page++; await this._update(ctx, msg, st, db); return; }
      } catch (e) {}
    });
    col.on("end", () => { try { msg.edit({ components: [msg.components[0]] }).catch(() => {}); } catch (e) {} });
  }
};
