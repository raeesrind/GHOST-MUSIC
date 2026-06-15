const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  MessageFlags
} = require("discord.js");

const emoji = require("../emojis");

class TicketUI {
  static buildTicketPanel(ticket, category, addedUsers = []) {
    const container = new ContainerBuilder();
    const statusText = ticket.status === "open" ? "Open" : "Closed";
    const welcomeMsg = category.settings?.welcomeMessage || "Welcome! Support will be with you shortly.";
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${emoji.ticket} ${category.name}\n\n${welcomeMsg}\n\n**Status:** ${statusText}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    if (ticket.status === "open") {
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(`ticket_add_user_${ticket.ticketId}`)
            .setPlaceholder("Add user to ticket...")
            .setMaxValues(1)
        )
      );

      if (addedUsers.length > 0) {
        const removeOptions = addedUsers.map(u => ({
          label: u.username || `User ${u.userId}`,
          value: u.userId,
          description: `Added by ${u.addedByUsername || 'Unknown'}`
        }));
        container.addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`ticket_remove_user_${ticket.ticketId}`)
              .setPlaceholder("Remove user from ticket...")
              .addOptions(removeOptions)
              .setMaxValues(1)
          )
        );
      }
      container.addSeparatorComponents(new SeparatorBuilder());
    }

    const buttons = [];
    if (ticket.status === "open") {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticket.ticketId}`)
          .setEmoji(emoji.lock)
          .setStyle(ButtonStyle.Danger)
      );
    } else {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`ticket_reopen_${ticket.ticketId}`)
          .setEmoji(emoji.unlock)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ticket_delete_${ticket.ticketId}`)
          .setEmoji(emoji.trash)
          .setStyle(ButtonStyle.Danger)
      );
    }
    container.addActionRowComponents(new ActionRowBuilder().addComponents(...buttons));
    return container;
  }

  static buildRatingRequest(ticketId, userId) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## Rate Your Experience\n\n<@${userId}>, please rate your support experience:`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`ticket_rate_${ticketId}`)
          .setPlaceholder("Rate your experience")
          .addOptions([
            { label: "1 Star - Very Poor", value: "1", emoji: "😞" },
            { label: "2 Stars - Poor", value: "2", emoji: "😕" },
            { label: "3 Stars - Average", value: "3", emoji: "😐" },
            { label: "4 Stars - Good", value: "4", emoji: "🙂" },
            { label: "5 Stars - Excellent", value: "5", emoji: "😄" }
          ])
      )
    );
    return container;
  }

  static buildError(title, message) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${emoji.cross} ${title}\n\n${message}`)
    );
    return container;
  }

  static buildSuccess(title, message) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${emoji.check} ${title}\n\n${message}`)
    );
    return container;
  }

  static buildWarning(title, message) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${emoji.logs} ${title}\n\n${message}`)
    );
    return container;
  }

  static buildInfo(title, message) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${title}\n\n${message}`)
    );
    return container;
  }

  static buildConfirmation(title, message, confirmId, cancelId, confirmLabel = "Confirm", confirmStyle = ButtonStyle.Danger) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${title}\n\n${message}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(confirmId)
          .setLabel(confirmLabel)
          .setStyle(confirmStyle),
        new ButtonBuilder()
          .setCustomId(cancelId)
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      )
    );
    return container;
  }

  static buildLogEmbed(title, data) {
    const container = new ContainerBuilder();
    let content = `## ${title}\n\n`;
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        content += `**${key}:** ${value}\n`;
      }
    }
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    return container;
  }

  static buildPanelMessage(panel, cats) {
    const container = new ContainerBuilder();
    const title = panel.panelMessage?.title || "Ticket Panel";
    const description = panel.panelMessage?.description || `${emoji.ticket} Select a category below to create a ticket`;
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    const opts = cats.map(cat => ({
      label: cat.name.substring(0, 100),
      value: cat.categoryId,
      emoji: cat.emoji || emoji.ticket,
      description: cat.description?.substring(0, 100) || undefined
    }));
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("ticket_create")
          .setPlaceholder(panel.selectMenuConfig?.placeholder || "Select a ticket category")
          .addOptions(opts)
      )
    );
    return container;
  }

  static getFlags() {
    return MessageFlags.IsComponentsV2;
  }

  static getEphemeralFlags() {
    return MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
  }
}

module.exports = TicketUI;
