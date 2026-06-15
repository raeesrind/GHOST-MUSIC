const {
  PermissionFlagsBits,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  SeparatorBuilder,
  MessageFlags,
  AttachmentBuilder
} = require("discord.js");
const discordTranscripts = require("discord-html-transcripts");
const TicketUI = require("./ticketUI");
const logger = require("./logger");

class TicketManager {
  static async handleInteraction(interaction, client) {
    if (interaction.isModalSubmit()) return this.handleModalSubmit(interaction, client);
    if (!interaction.isMessageComponent()) return false;

    const customId = interaction.customId;
    let handled = true;

    if (customId === "ticket_create") {
      await this.handleTicketCreate(interaction, client);
    } else if (customId.startsWith("ticket_add_user_")) {
      await this.handleTicketAddUser(interaction, client);
    } else if (customId.startsWith("ticket_remove_user_")) {
      await this.handleTicketRemoveUser(interaction, client);
    } else if (customId.startsWith("ticket_close_")) {
      await this.handleTicketCloseButton(interaction, client);
    } else if (customId.startsWith("ticket_reopen_")) {
      await this.handleTicketReopen(interaction, client);
    } else if (customId.startsWith("ticket_delete_")) {
      await this.handleTicketDelete(interaction, client);
    } else if (customId.startsWith("ticket_rate_")) {
      await this.handleTicketRate(interaction, client);
    } else if (customId.startsWith("confirm_reopen_")) {
      await this.handleConfirmReopen(interaction, client);
    } else if (customId.startsWith("cancel_reopen_")) {
      await this.handleCancelAction(interaction, "The reopen request has been cancelled.");
    } else if (customId.startsWith("confirm_delete_")) {
      await this.handleConfirmDelete(interaction, client);
    } else if (customId.startsWith("cancel_delete_")) {
      await this.handleCancelAction(interaction, "The delete request has been cancelled.");
    } else {
      handled = false;
    }

    return handled;
  }

  static async handleModalSubmit(interaction, client) {
    if (interaction.customId.startsWith("close_modal_")) {
      await this.handleCloseModal(interaction, client);
      return true;
    }
    if (interaction.customId.startsWith("rate_modal_")) {
      await this.handleRateModal(interaction, client);
      return true;
    }
    return false;
  }

  static async handleTicketCreate(interaction, client) {
    await interaction.deferReply({ flags: TicketUI.getEphemeralFlags() });

    const categoryId = interaction.values[0];
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const panels = client.db.ticketPanels.getGuildPanels(guildId);
    const panel = panels.find(p => p.categories.some(c => c.categoryId === categoryId));

    if (!panel) {
      return interaction.editReply({
        components: [TicketUI.buildError("Panel Not Found", "The ticket panel could not be located.")],
        flags: TicketUI.getFlags()
      });
    }

    const category = panel.categories.find(c => c.categoryId === categoryId);
    if (!category || !category.isActive) {
      return interaction.editReply({
        components: [TicketUI.buildWarning("Category Unavailable", "This ticket category is currently disabled or does not exist.")],
        flags: TicketUI.getFlags()
      });
    }

    const blacklisted = client.db.ticketGuilds.isUserBlacklisted(guildId, userId);
    if (blacklisted) {
      return interaction.editReply({
        components: [TicketUI.buildError("Access Denied", "You are blacklisted from creating tickets in this server.")],
        flags: TicketUI.getFlags()
      });
    }

    const openTickets = client.db.ticketTickets.getUserOpenTickets(guildId, userId, categoryId);
    if (openTickets.length >= (category.settings.maxTicketsPerUser || 1)) {
      return interaction.editReply({
        components: [TicketUI.buildWarning("Maximum Tickets Reached", `You already have **${category.settings.maxTicketsPerUser}** open ticket(s) in this category.\n\nPlease close an existing ticket before creating a new one.`)],
        flags: TicketUI.getFlags()
      });
    }

    const ticket = client.db.ticketTickets.create(guildId, panel.panelId, categoryId, userId);
    await this.createTicketChannel(client, ticket, panel, category, guildId, userId);

    await interaction.editReply({
      components: [TicketUI.buildSuccess("Ticket Created", `Your ticket has been created! <#${ticket.channelId}>`)],
      flags: TicketUI.getFlags()
    });
  }

  static async createTicketChannel(client, ticket, panel, category, guildId, userId) {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const user = await client.users.fetch(userId).catch(() => null);
      if (!user) return;

      const userTickets = client.db.ticketTickets.getUserOpenTickets(guildId, userId, category.categoryId);
      const ticketNumber = userTickets.length;

      const channelName = (category.namingFormat || "ticket-{username}-{number}")
        .replace("{username}", user.username.toLowerCase().replace(/[^a-z0-9]/g, ""))
        .replace("{number}", ticketNumber.toString().padStart(3, '0'));

      const permissionOverwrites = [
        { id: guildId, deny: [PermissionFlagsBits.ViewChannel] },
        { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] }
      ];

      for (const roleId of category.supportRoles || []) {
        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (role) {
          permissionOverwrites.push({
            id: roleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
          });
        }
      }

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.ticketChannelCategory || null,
        permissionOverwrites,
        topic: `Ticket #${ticket.ticketId} | User: ${user.tag}`
      });

      client.db.ticketTickets.setChannel(ticket.ticketId, channel.id);
      ticket.channelId = channel.id;

      let pingContent = "";
      if (category.settings.pingUser) pingContent += `<@${userId}> `;
      if (category.settings.pingRole && category.supportRoles?.length > 0) {
        pingContent += category.supportRoles.map(r => `<@&${r}>`).join(" ");
      }
      if (pingContent) {
        await channel.send({ content: pingContent });
      }

      const currentTicket = client.db.ticketTickets.get(ticket.ticketId);
      const controlMsg = await channel.send({
        components: [TicketUI.buildTicketPanel(currentTicket, category, [])],
        flags: TicketUI.getFlags()
      });
      await controlMsg.pin().catch(() => {});
      client.db.ticketTickets.setControlMessage(ticket.ticketId, controlMsg.id);

      if (category.settings.dmUserOnOpen) {
        try {
          await user.send(`Your ticket has been created in **${guild.name}**: <#${channel.id}>`);
        } catch (e) {}
      }

      if (panel.logs?.createChannel) {
        const logChannel = await guild.channels.fetch(panel.logs.createChannel).catch(() => null);
        if (logChannel?.isTextBased()) {
          await logChannel.send({
            components: [TicketUI.buildLogEmbed("Ticket Created", { User: `<@${userId}>`, Category: category.name, Channel: `<#${channel.id}>`, "Ticket ID": ticket.ticketId })],
            flags: TicketUI.getFlags(),
            allowedMentions: { parse: [] }
          });
        }
      }

      logger.log(`[Ticket] ${ticket.ticketId} created in ${channel.id}`, "log");
    } catch (error) {
      logger.log(`[Ticket] Failed to create ticket channel: ${error.message}`, "error");
    }
  }

  static async handleTicketCloseButton(interaction, client) {
    const ticket = await this.getTicketFromChannel(interaction, client);
    if (!ticket) return;

    if (ticket.status === "closed") {
      return interaction.reply({
        components: [TicketUI.buildWarning("Already Closed", "This ticket is already closed.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    const canClose = await this.checkTicketPermission(interaction, client, ticket, "close");
    if (!canClose) {
      return interaction.reply({
        components: [TicketUI.buildError("Permission Denied", "You don't have permission to close this ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`close_modal_${ticket.ticketId}`)
      .setTitle("Close Ticket");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("Reason for closing (optional)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Provide a reason for closing this ticket...")
          .setMaxLength(500)
          .setRequired(false)
      )
    );
    await interaction.showModal(modal);
  }

  static async handleCloseModal(interaction, client) {
    const ticketId = interaction.customId.replace("close_modal_", "");
    const ticket = client.db.ticketTickets.get(ticketId);
    if (!ticket) return;

    await interaction.deferUpdate();
    const reason = interaction.fields.getTextInputValue("reason")?.trim() || null;

    client.db.ticketTickets.close(ticketId, interaction.user.id, reason);
    await this.closeTicketChannel(client, ticket, interaction.user.id, reason);

    await interaction.followUp({
      components: [TicketUI.buildSuccess("Ticket Closed", "The ticket has been closed successfully.")],
      flags: TicketUI.getEphemeralFlags()
    });
  }

  static async closeTicketChannel(client, ticket, closedBy, reason) {
    try {
      const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
      if (!guild) return;

      const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
      if (!channel) return;

      const panel = client.db.ticketPanels.get(ticket.panelId);
      const category = panel?.categories.find(c => c.categoryId === ticket.categoryId);

      const controlMsgId = ticket.controlMessageId;
      if (controlMsgId && channel) {
        const controlMsg = await channel.messages.fetch(controlMsgId).catch(() => null);
        if (controlMsg) {
          const currentTicket = client.db.ticketTickets.get(ticket.ticketId);
          await controlMsg.edit({
            components: [TicketUI.buildTicketPanel(currentTicket, category || {}, [])],
            flags: TicketUI.getFlags()
          });
        }
      }

      await channel.send({
        components: [TicketUI.buildRatingRequest(ticket.ticketId, ticket.userId)],
        flags: TicketUI.getFlags()
      });

      const user = await client.users.fetch(ticket.userId).catch(() => null);
      if (user) {
        await channel.permissionOverwrites.edit(user, { SendMessages: false }).catch(() => {});
      }

      const addedUsers = client.db.ticketTickets.getAddedUsers(ticket.ticketId);
      for (const au of addedUsers) {
        try {
          const u = await client.users.fetch(au.userId);
          await channel.permissionOverwrites.edit(u, { SendMessages: false });
        } catch (e) {}
      }

      if (category?.settings?.dmUserOnClose) {
        try {
          const u = await client.users.fetch(ticket.userId);
          await u.send(`Your ticket in **${guild.name}** has been closed.${reason ? `\nReason: ${reason}` : ""}`);
        } catch (e) {}
      }

      if (panel?.logs?.closeChannel) {
        const logChannel = await guild.channels.fetch(panel.logs.closeChannel).catch(() => null);
        if (logChannel?.isTextBased()) {
          await logChannel.send({
            components: [TicketUI.buildLogEmbed("Ticket Closed", { User: `<@${ticket.userId}>`, "Closed By": `<@${closedBy}>`, Channel: `<#${ticket.channelId}>`, "Ticket ID": ticket.ticketId, ...(reason && { Reason: reason }) })],
            flags: TicketUI.getFlags(),
            allowedMentions: { parse: [] }
          });
        }
      }

      logger.log(`[Ticket] ${ticket.ticketId} closed by ${closedBy}`, "log");
    } catch (error) {
      logger.log(`[Ticket] Failed to close ticket: ${error.message}`, "error");
    }
  }

  static async handleTicketDelete(interaction, client) {
    const ticket = await this.getTicketFromChannel(interaction, client);
    if (!ticket) return;

    const canDelete = await this.checkTicketPermission(interaction, client, ticket, "delete");
    if (!canDelete) {
      return interaction.reply({
        components: [TicketUI.buildError("Permission Denied", "You don't have permission to delete this ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    await interaction.reply({
      components: [TicketUI.buildConfirmation(
        `${emoji.trash} Delete Ticket`,
        "This will **permanently delete** the ticket channel and all its contents.\n\n**This action cannot be undone!**\n\nAre you absolutely sure?",
        `confirm_delete_${ticket.ticketId}`,
        `cancel_delete_${ticket.ticketId}`,
        "Confirm Delete"
      )],
      flags: TicketUI.getEphemeralFlags()
    });
  }

  static async handleConfirmDelete(interaction, client) {
    await interaction.deferUpdate();
    const ticketId = interaction.customId.replace("confirm_delete_", "");
    const ticket = client.db.ticketTickets.get(ticketId);
    if (!ticket) {
      return interaction.editReply({
        components: [TicketUI.buildError("Ticket Not Found", "The ticket could not be located.")],
        flags: TicketUI.getFlags()
      });
    }

    await this.deleteTicketChannel(client, ticket);
    client.db.ticketTickets.delete(ticketId);

    try {
      await interaction.editReply({
        components: [TicketUI.buildSuccess("Ticket Deleted", "The ticket channel will be deleted momentarily.")],
        flags: TicketUI.getFlags()
      });
    } catch (_) {}
  }

  static async deleteTicketChannel(client, ticket) {
    try {
      const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
      if (!guild) return;

      const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);

      let transcriptBuffer = null;
      const MAX_SIZE = 5 * 1024 * 1024;

      if (channel?.isTextBased()) {
        try {
          transcriptBuffer = await discordTranscripts.createTranscript(channel, {
            limit: -1,
            returnType: "buffer",
            saveImages: false,
            poweredBy: false
          });
          if (transcriptBuffer.length > MAX_SIZE) {
            transcriptBuffer = null;
          }
        } catch (error) {
          logger.log(`[Ticket] Failed to create transcript: ${error.message}`, "error");
        }

        await channel.delete("Ticket deleted from database").catch(() => {});
      }

      const panels = client.db.ticketPanels.getGuildPanels(ticket.guildId);
      const panel = panels.find(p => p.panelId === ticket.panelId);

      if (panel?.logs?.deleteChannel) {
        const logChannel = await guild.channels.fetch(panel.logs.deleteChannel).catch(() => null);
        if (logChannel?.isTextBased()) {
          const content = `## Ticket Deleted\n\n**User:** <@${ticket.userId}>\n**Channel:** <#${ticket.channelId}>\n**Ticket ID:** ${ticket.ticketId}\n**Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n**Transcript:** attached below`;
          const container = new ContainerBuilder();
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
          container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

          const files = [];
          if (transcriptBuffer) {
            const fileName = `ticket-${ticket.ticketId}-transcript.html`;
            files.push(new AttachmentBuilder(transcriptBuffer, { name: fileName }));
          }

          await logChannel.send({
            components: [container],
            files,
            flags: TicketUI.getFlags(),
            allowedMentions: { parse: [] }
          });
        }
      }

      logger.log(`[Ticket] ${ticket.ticketId} and channel ${ticket.channelId} deleted`, "log");
    } catch (error) {
      logger.log(`[Ticket] Failed to delete channel: ${error.message}`, "error");
    }
  }

  static async handleTicketReopen(interaction, client) {
    const ticket = await this.getTicketFromChannel(interaction, client);
    if (!ticket) return;

    if (ticket.status === "open") {
      return interaction.reply({
        components: [TicketUI.buildInfo("Already Open", "This ticket is already open.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    const canReopen = await this.checkTicketPermission(interaction, client, ticket, "reopen");
    if (!canReopen) {
      return interaction.reply({
        components: [TicketUI.buildError("Permission Denied", "You don't have permission to reopen this ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    const e = require("../emojis");
    await interaction.reply({
      components: [TicketUI.buildConfirmation(
        `${e.unlock} Reopen Ticket`,
        "Are you sure you want to reopen this ticket? This will restore full access and allow continued support.",
        `confirm_reopen_${ticket.ticketId}`,
        `cancel_reopen_${ticket.ticketId}`,
        "Confirm Reopen",
        ButtonStyle.Success
      )],
      flags: TicketUI.getEphemeralFlags()
    });
  }

  static async handleConfirmReopen(interaction, client) {
    await interaction.deferUpdate();
    const ticketId = interaction.customId.replace("confirm_reopen_", "");
    const ticket = client.db.ticketTickets.get(ticketId);
    if (!ticket) {
      return interaction.editReply({
        components: [TicketUI.buildError("Ticket Not Found", "The ticket could not be located.")],
        flags: TicketUI.getFlags()
      });
    }

    if (ticket.status === "open") {
      return interaction.editReply({
        components: [TicketUI.buildInfo("Already Open", "This ticket is already open.")],
        flags: TicketUI.getFlags()
      });
    }

    client.db.ticketTickets.reopen(ticketId);
    await this.reopenTicketChannel(client, ticket);

    await interaction.editReply({
      components: [TicketUI.buildSuccess("Ticket Reopened", "The ticket has been successfully reopened and is now active.")],
      flags: TicketUI.getFlags()
    });
  }

  static async reopenTicketChannel(client, ticket) {
    try {
      const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
      if (!guild) return;

      const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
      if (!channel) return;

      const panel = client.db.ticketPanels.get(ticket.panelId);
      const category = panel?.categories.find(c => c.categoryId === ticket.categoryId);

      const currentTicket = client.db.ticketTickets.get(ticket.ticketId);
      const addedUsers = client.db.ticketTickets.getAddedUsers(ticket.ticketId);
      const enrichedUsers = [];

      for (const au of addedUsers) {
        const u = await client.users.fetch(au.userId).catch(() => null);
        const addedByUser = await client.users.fetch(au.addedBy).catch(() => null);
        enrichedUsers.push({
          userId: au.userId,
          username: u?.username || `User ${au.userId}`,
          addedByUsername: addedByUser?.username || 'Unknown'
        });
      }

      const controlMsgId = ticket.controlMessageId;
      if (controlMsgId) {
        const controlMsg = await channel.messages.fetch(controlMsgId).catch(() => null);
        if (controlMsg) {
          await controlMsg.edit({
            components: [TicketUI.buildTicketPanel(currentTicket, category || {}, enrichedUsers)],
            flags: TicketUI.getFlags()
          });
        }
      }

      const owner = await client.users.fetch(ticket.userId).catch(() => null);
      if (owner) {
        await channel.permissionOverwrites.edit(owner, { SendMessages: true }).catch(() => {});
      }

      await channel.send({
        components: [TicketUI.buildSuccess("Ticket Reopened", "This ticket has been reopened and is now active.")],
        flags: TicketUI.getFlags()
      });

      if (panel?.logs?.createChannel) {
        const logChannel = await guild.channels.fetch(panel.logs.createChannel).catch(() => null);
        if (logChannel?.isTextBased()) {
          await logChannel.send({
            components: [TicketUI.buildLogEmbed("Ticket Reopened", { User: `<@${ticket.userId}>`, Channel: `<#${ticket.channelId}>`, "Ticket ID": ticket.ticketId })],
            flags: TicketUI.getFlags(),
            allowedMentions: { parse: [] }
          });
        }
      }

      logger.log(`[Ticket] ${ticket.ticketId} reopened`, "log");
    } catch (error) {
      logger.log(`[Ticket] Failed to reopen channel: ${error.message}`, "error");
    }
  }

  static async handleTicketAddUser(interaction, client) {
    await interaction.deferUpdate();
    const ticketId = interaction.customId.replace("ticket_add_user_", "");
    const userId = interaction.values[0];
    const ticket = client.db.ticketTickets.get(ticketId);

    if (!ticket) {
      return interaction.followUp({
        components: [TicketUI.buildError("Ticket Not Found", "The ticket could not be located.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    if (ticket.status === "closed") {
      return interaction.followUp({
        components: [TicketUI.buildWarning("Ticket Closed", "Cannot add users to a closed ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    const canAdd = await this.checkTicketPermission(interaction, client, ticket, "add");
    if (!canAdd) {
      return interaction.followUp({
        components: [TicketUI.buildError("Permission Denied", "You don't have permission to add users to this ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    if (userId === ticket.userId) {
      return interaction.followUp({
        components: [TicketUI.buildWarning("Invalid User", "The ticket creator is already part of this ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    const addedUsers = client.db.ticketTickets.getAddedUsers(ticketId);
    if (addedUsers.length >= 5) {
      return interaction.followUp({
        components: [TicketUI.buildWarning("Maximum Users Reached", "A maximum of 5 users can be added to a ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    const isAlreadyAdded = client.db.ticketTickets.isUserAdded(ticketId, userId);
    if (isAlreadyAdded) {
      return interaction.followUp({
        components: [TicketUI.buildInfo("User Already Added", "This user already has access to the ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    client.db.ticketTickets.addUser(ticketId, userId, interaction.user.id);
    await this.addUserToTicketChannel(client, ticket, userId, interaction.user.id);

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${require("../emojis").add} User Added\n\n<@${userId}> has been granted access to this ticket`));
    await interaction.followUp({ components: [container], flags: TicketUI.getEphemeralFlags() });
  }

  static async addUserToTicketChannel(client, ticket, userId, addedBy) {
    try {
      const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
      if (!guild) return;

      const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
      if (!channel) return;

      const panel = client.db.ticketPanels.get(ticket.panelId);
      const category = panel?.categories.find(c => c.categoryId === ticket.categoryId);

      await channel.permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      }).catch(() => {});

      await channel.send({
        components: [TicketUI.buildSuccess("User Added", `<@${userId}> has been added to this ticket by <@${addedBy}>`)],
        flags: TicketUI.getFlags()
      });

      const addedUsers = client.db.ticketTickets.getAddedUsers(ticket.ticketId);
      const enrichedUsers = [];
      for (const au of addedUsers) {
        const u = await client.users.fetch(au.userId).catch(() => null);
        const addedByUser = await client.users.fetch(au.addedBy).catch(() => null);
        enrichedUsers.push({
          userId: au.userId,
          username: u?.username || `User ${au.userId}`,
          addedByUsername: addedByUser?.username || 'Unknown'
        });
      }

      const controlMsgId = ticket.controlMessageId;
      if (controlMsgId) {
        const controlMsg = await channel.messages.fetch(controlMsgId).catch(() => null);
        if (controlMsg) {
          const currentTicket = client.db.ticketTickets.get(ticket.ticketId);
          await controlMsg.edit({
            components: [TicketUI.buildTicketPanel(currentTicket, category || {}, enrichedUsers)],
            flags: TicketUI.getFlags()
          });
        }
      }

      if (panel?.logs?.userAddChannel) {
        const logChannel = await guild.channels.fetch(panel.logs.userAddChannel).catch(() => null);
        if (logChannel?.isTextBased()) {
          await logChannel.send({
            components: [TicketUI.buildLogEmbed("User Added to Ticket", { User: `<@${userId}>`, "Added By": `<@${addedBy}>`, Channel: `<#${ticket.channelId}>`, "Ticket ID": ticket.ticketId })],
            flags: TicketUI.getFlags(),
            allowedMentions: { parse: [] }
          });
        }
      }

      logger.log(`[Ticket] User ${userId} added to ${ticket.ticketId}`, "log");
    } catch (error) {
      logger.log(`[Ticket] Failed to add user: ${error.message}`, "error");
    }
  }

  static async handleTicketRemoveUser(interaction, client) {
    await interaction.deferUpdate();
    const ticketId = interaction.customId.replace("ticket_remove_user_", "");
    const userId = interaction.values[0];
    const ticket = client.db.ticketTickets.get(ticketId);

    if (!ticket) {
      return interaction.followUp({
        components: [TicketUI.buildError("Ticket Not Found", "The ticket could not be located.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    if (ticket.status === "closed") {
      return interaction.followUp({
        components: [TicketUI.buildWarning("Ticket Closed", "Cannot remove users from a closed ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    const canRemove = await this.checkTicketPermission(interaction, client, ticket, "remove");
    if (!canRemove) {
      return interaction.followUp({
        components: [TicketUI.buildError("Permission Denied", "You don't have permission to remove users from this ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    client.db.ticketTickets.removeUser(ticketId, userId, interaction.user.id);
    await this.removeUserFromTicketChannel(client, ticket, userId, interaction.user.id);

    const e = require("../emojis");
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${e.remove} User Removed\n\n<@${userId}> has been removed from this ticket`));
    await interaction.followUp({ components: [container], flags: TicketUI.getEphemeralFlags() });
  }

  static async removeUserFromTicketChannel(client, ticket, userId, removedBy) {
    try {
      const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
      if (!guild) return;

      const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
      if (!channel) return;

      const panel = client.db.ticketPanels.get(ticket.panelId);
      const category = panel?.categories.find(c => c.categoryId === ticket.categoryId);

      await channel.permissionOverwrites.delete(userId).catch(() => {});

      await channel.send({
        components: [TicketUI.buildWarning("User Removed", `<@${userId}> has been removed from this ticket by <@${removedBy}>`)],
        flags: TicketUI.getFlags()
      });

      const addedUsers = client.db.ticketTickets.getAddedUsers(ticket.ticketId);
      const enrichedUsers = [];
      for (const au of addedUsers) {
        const u = await client.users.fetch(au.userId).catch(() => null);
        const addedByUser = await client.users.fetch(au.addedBy).catch(() => null);
        enrichedUsers.push({
          userId: au.userId,
          username: u?.username || `User ${au.userId}`,
          addedByUsername: addedByUser?.username || 'Unknown'
        });
      }

      const controlMsgId = ticket.controlMessageId;
      if (controlMsgId) {
        const controlMsg = await channel.messages.fetch(controlMsgId).catch(() => null);
        if (controlMsg) {
          const currentTicket = client.db.ticketTickets.get(ticket.ticketId);
          await controlMsg.edit({
            components: [TicketUI.buildTicketPanel(currentTicket, category || {}, enrichedUsers)],
            flags: TicketUI.getFlags()
          });
        }
      }

      if (panel?.logs?.userRemoveChannel) {
        const logChannel = await guild.channels.fetch(panel.logs.userRemoveChannel).catch(() => null);
        if (logChannel?.isTextBased()) {
          await logChannel.send({
            components: [TicketUI.buildLogEmbed("User Removed from Ticket", { User: `<@${userId}>`, "Removed By": `<@${removedBy}>`, Channel: `<#${ticket.channelId}>`, "Ticket ID": ticket.ticketId })],
            flags: TicketUI.getFlags(),
            allowedMentions: { parse: [] }
          });
        }
      }

      logger.log(`[Ticket] User ${userId} removed from ${ticket.ticketId}`, "log");
    } catch (error) {
      logger.log(`[Ticket] Failed to remove user: ${error.message}`, "error");
    }
  }

  static async handleTicketRate(interaction, client) {
    const ticketId = interaction.customId.replace("ticket_rate_", "");
    const stars = parseInt(interaction.values[0]);
    const ticket = client.db.ticketTickets.get(ticketId);

    if (!ticket) {
      return interaction.reply({
        components: [TicketUI.buildError("Ticket Not Found", "The ticket could not be located.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    if (interaction.user.id !== ticket.userId) {
      return interaction.reply({
        components: [TicketUI.buildError("Permission Denied", "Only the ticket creator can provide a rating.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    if (ticket.rating?.stars) {
      return interaction.reply({
        components: [TicketUI.buildInfo("Already Rated", "You have already submitted a rating for this ticket.")],
        flags: TicketUI.getEphemeralFlags()
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`rate_modal_${ticketId}_${stars}`)
      .setTitle("Rate Your Experience");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("feedback")
          .setLabel("Additional feedback (optional)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Share your experience with our support team...")
          .setMaxLength(1000)
          .setRequired(false)
      )
    );
    await interaction.showModal(modal);
  }

  static async handleRateModal(interaction, client) {
    const parts = interaction.customId.replace("rate_modal_", "").split("_");
    const ticketId = parts.slice(0, -1).join("_");
    const stars = parseInt(parts[parts.length - 1]);

    await interaction.deferUpdate();
    const feedback = interaction.fields.getTextInputValue("feedback")?.trim() || null;
    client.db.ticketTickets.rate(ticketId, stars, feedback);

    const ticket = client.db.ticketTickets.get(ticketId);
    if (ticket) {
      const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
      if (guild) {
        const panel = client.db.ticketPanels.get(ticket.panelId);
        if (panel?.logs?.ratingChannel) {
          const logChannel = await guild.channels.fetch(panel.logs.ratingChannel).catch(() => null);
          if (logChannel?.isTextBased()) {
            const starsDisplay = "⭐".repeat(stars);
            const logData = {
              User: `<@${ticket.userId}>`,
              Channel: `<#${ticket.channelId}>`,
              Rating: `${starsDisplay} (${stars}/5)`,
              "Ticket ID": ticket.ticketId
            };
            if (feedback) logData.Feedback = feedback;
            await logChannel.send({
              components: [TicketUI.buildLogEmbed("Ticket Rated", logData)],
              flags: TicketUI.getFlags(),
              allowedMentions: { parse: [] }
            });
          }
        }
      }
    }

    await interaction.followUp({
      components: [TicketUI.buildSuccess("Thank You!", "Your feedback has been recorded and helps us improve our support services.")],
      flags: TicketUI.getEphemeralFlags()
    });
  }

  static async handleCancelAction(interaction, message) {
    await interaction.update({
      components: [TicketUI.buildInfo("Action Cancelled", message)],
      flags: TicketUI.getFlags()
    });
  }

  static async getTicketFromChannel(interaction, client) {
    const ticket = client.db.ticketTickets.getByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")],
        flags: TicketUI.getEphemeralFlags()
      });
      return null;
    }
    return ticket;
  }

  static async checkTicketPermission(interaction, client, ticket, action) {
    const panel = client.db.ticketPanels.get(ticket.panelId);
    if (!panel) return false;

    const category = panel.categories.find(c => c.categoryId === ticket.categoryId);
    if (!category) return false;

    const staffRoles = client.db.ticketGuilds.getStaffRoles(interaction.guild.id);
    const hasStaffRole = interaction.member.roles.cache.some(r => staffRoles.includes(r.id));
    const hasSupportRole = interaction.member.roles.cache.some(r => (category.supportRoles || []).includes(r.id));
    const isTicketOwner = interaction.user.id === ticket.userId;
    const hasManageChannels = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (action === "close") {
      return hasManageChannels || hasStaffRole || hasSupportRole || (category.settings?.userCanClose && isTicketOwner);
    }

    return hasManageChannels || hasStaffRole || hasSupportRole;
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = TicketManager;
