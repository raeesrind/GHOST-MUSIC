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
  name: 'reopen',
  category: 'Ticket',
  description: 'Reopen a closed ticket',
  aliases: ['treopen'],
  usage: 'reopen',
  slashOptions: [],
  async slashExecute(interaction, client) {
    const ticket = client.db.ticketTickets.getByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    if (ticket.status === "open") {
      return interaction.reply({ components: [TicketUI.buildInfo("Already Open", "This ticket is already open.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    const canReopen = await checkTicketPermission(interaction, client, ticket);
    if (!canReopen) {
      return interaction.reply({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to reopen this ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    await interaction.reply({
      components: [TicketUI.buildConfirmation(
        `${emoji.unlock} Reopen Ticket`,
        "Are you sure you want to reopen this ticket? This will restore full access and allow continued support.",
        `confirm_reopen_${ticket.ticketId}`,
        `cancel_reopen_${ticket.ticketId}`,
        "Confirm Reopen",
        ButtonStyle.Success
      )],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  },
  async execute(message, args, client, prefix) {
    const ticket = client.db.ticketTickets.getByChannel(message.channel.id);
    if (!ticket) {
      return message.channel.send({ components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")], flags: MessageFlags.IsComponentsV2 });
    }
    if (ticket.status === "open") {
      return message.channel.send({ components: [TicketUI.buildInfo("Already Open", "This ticket is already open.")], flags: MessageFlags.IsComponentsV2 });
    }
    const canReopen = await checkTicketPermission(message, client, ticket);
    if (!canReopen) {
      return message.channel.send({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to reopen this ticket.")], flags: MessageFlags.IsComponentsV2 });
    }

    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## ${emoji.unlock} Reopen Ticket\n\nAre you sure you want to reopen this ticket? This will restore full access and allow continued support.`
    ));
    c.addSeparatorComponents(new (require("discord.js").SeparatorBuilder)().setDivider(true));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`reopen_confirm_${ticket.ticketId}`).setLabel("Confirm Reopen").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("reopen_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    ));

    const msg = await message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    const col = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
    col.on("collect", async i => {
      if (i.customId === `reopen_confirm_${ticket.ticketId}`) {
        await i.deferUpdate();
        client.db.ticketTickets.reopen(ticket.ticketId);
        const TicketManager = require("../../utils/ticketManager");
        await TicketManager.reopenTicketChannel(client, ticket);
        await i.editReply({ components: [TicketUI.buildSuccess("Ticket Reopened", "The ticket has been successfully reopened and is now active.")], flags: MessageFlags.IsComponentsV2 });
        col.stop();
      } else if (i.customId === "reopen_cancel") {
        await i.update({ components: [TicketUI.buildInfo("Action Cancelled", "The reopen request has been cancelled.")], flags: MessageFlags.IsComponentsV2 });
        col.stop();
      }
    });
  }
};
