const {
  PermissionFlagsBits,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder
} = require("discord.js");
const emoji = require("../../emojis");
const TicketUI = require("../../utils/ticketUI");
const TicketManager = require("../../utils/ticketManager");

async function checkTicketPermission(ctx, client, ticket) {
  const panel = client.db.ticketPanels.get(ticket.panelId);
  if (!panel) return false;
  const category = panel.categories.find(c => c.categoryId === ticket.categoryId);
  if (!category) return false;
  const staffRoles = client.db.ticketGuilds.getStaffRoles(ctx.guild.id);
  const hasStaffRole = ctx.member.roles.cache.some(r => staffRoles.includes(r.id));
  const hasSupportRole = ctx.member.roles.cache.some(r => (category.supportRoles || []).includes(r.id));
  const isTicketOwner = ctx.author.id === ticket.userId;
  const hasManageChannels = ctx.member.permissions.has(PermissionFlagsBits.ManageChannels);
  return hasManageChannels || hasStaffRole || hasSupportRole || (category.settings?.userCanClose && isTicketOwner);
}

module.exports = {
  name: 'close',
  category: 'Ticket',
  description: 'Close a ticket',
  aliases: ['tclose'],
  usage: 'close [reason]',
  slashOptions: [
    {
      name: 'reason',
      description: 'Reason for closing',
      type: 3,
      required: false
    }
  ],
  async slashExecute(interaction, client) {
    const ticket = client.db.ticketTickets.getByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    if (ticket.status === "closed") {
      return interaction.reply({ components: [TicketUI.buildWarning("Already Closed", "This ticket is already closed.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    const canClose = await checkTicketPermission(interaction, client, ticket);
    if (!canClose) {
      return interaction.reply({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to close this ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }

    const reason = interaction.options.getString("reason");
    if (reason) {
      client.db.ticketTickets.close(ticket.ticketId, interaction.user.id, reason);
      await TicketManager.closeTicketChannel(client, ticket, interaction.user.id, reason);
      return interaction.reply({ components: [TicketUI.buildSuccess("Ticket Closed", "The ticket has been closed successfully.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }

    const modal = new ModalBuilder().setCustomId(`close_modal_${ticket.ticketId}`).setTitle("Close Ticket");
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("reason").setLabel("Reason for closing (optional)").setStyle(TextInputStyle.Paragraph).setPlaceholder("Provide a reason for closing this ticket...").setMaxLength(500).setRequired(false)
    ));
    await interaction.showModal(modal);
  },
  async execute(message, args, client, prefix) {
    const ticket = client.db.ticketTickets.getByChannel(message.channel.id);
    if (!ticket) {
      return message.channel.send({ components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")], flags: MessageFlags.IsComponentsV2 });
    }
    if (ticket.status === "closed") {
      return message.channel.send({ components: [TicketUI.buildWarning("Already Closed", "This ticket is already closed.")], flags: MessageFlags.IsComponentsV2 });
    }
    const canClose = await checkTicketPermission(message, client, ticket);
    if (!canClose) {
      return message.channel.send({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to close this ticket.")], flags: MessageFlags.IsComponentsV2 });
    }

    let reason = args.length > 0 ? args.join(" ") : "none";
    client.db.ticketTickets.close(ticket.ticketId, message.author.id, reason);
    await TicketManager.closeTicketChannel(client, ticket, message.author.id, reason);
    await message.channel.send({ components: [TicketUI.buildSuccess("Ticket Closed", "The ticket has been closed successfully.")], flags: MessageFlags.IsComponentsV2 });
  }
};
