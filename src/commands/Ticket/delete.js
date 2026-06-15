const {
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");
const emoji = require("../../emojis");
const TicketUI = require("../../utils/ticketUI");

async function checkTicketPermission(ctx, client, ticket) {
  const panel = client.db.ticketPanels.get(ticket.panelId);
  if (!panel) return false;
  const category = panel.categories.find(c => c.categoryId === ticket.categoryId);
  if (!category) return false;
  const staffRoles = client.db.ticketGuilds.getStaffRoles(ctx.guild.id);
  const hasStaffRole = ctx.member.roles.cache.some(r => staffRoles.includes(r.id));
  const hasSupportRole = ctx.member.roles.cache.some(r => (category.supportRoles || []).includes(r.id));
  const hasManageChannels = ctx.member.permissions.has(PermissionFlagsBits.ManageChannels);
  return hasManageChannels || hasStaffRole || hasSupportRole;
}

module.exports = {
  name: 'delete',
  category: 'Ticket',
  description: 'Delete a closed ticket',
  aliases: ['tdelete'],
  usage: 'delete',
  slashOptions: [],
  async slashExecute(interaction, client) {
    const ticket = client.db.ticketTickets.getByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    const canDelete = await checkTicketPermission(interaction, client, ticket);
    if (!canDelete) {
      return interaction.reply({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to delete this ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    await interaction.reply({
      components: [TicketUI.buildConfirmation(
        `${emoji.trash} Delete Ticket`,
        "This will **permanently delete** the ticket channel and all its contents.\n\n**This action cannot be undone!**\n\nAre you absolutely sure?",
        `confirm_delete_${ticket.ticketId}`,
        `cancel_delete_${ticket.ticketId}`,
        "Confirm Delete"
      )],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  },
  async execute(message, args, client, prefix) {
    const ticket = client.db.ticketTickets.getByChannel(message.channel.id);
    if (!ticket) {
      return message.channel.send({ components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")], flags: MessageFlags.IsComponentsV2 });
    }
    const canDelete = await checkTicketPermission(message, client, ticket);
    if (!canDelete) {
      return message.channel.send({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to delete this ticket.")], flags: MessageFlags.IsComponentsV2 });
    }

    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## ${emoji.trash} Delete Ticket\n\nThis will **permanently delete** the ticket channel and all its contents.\n\n**This action cannot be undone!**\n\nAre you absolutely sure?`
    ));
    c.addSeparatorComponents(new (require("discord.js").SeparatorBuilder)().setDivider(true));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`delete_confirm_${ticket.ticketId}`).setLabel("Confirm Delete").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("delete_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    ));

    const msg = await message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    const col = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
    col.on("collect", async i => {
      if (i.customId === `delete_confirm_${ticket.ticketId}`) {
        await i.deferUpdate();
        const TicketManager = require("../../utils/ticketManager");
        await TicketManager.deleteTicketChannel(client, ticket);
        client.db.ticketTickets.delete(ticket.ticketId);
        try {
          await i.editReply({ components: [TicketUI.buildSuccess("Ticket Deleted", "The ticket channel will be deleted momentarily.")], flags: MessageFlags.IsComponentsV2 });
        } catch (_) {}
        col.stop();
      } else if (i.customId === "delete_cancel") {
        await i.update({ components: [TicketUI.buildInfo("Action Cancelled", "The delete request has been cancelled.")], flags: MessageFlags.IsComponentsV2 });
        col.stop();
      }
    });
  }
};
