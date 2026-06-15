const {
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
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
  name: 'remove',
  category: 'Ticket',
  description: 'Remove a user from the ticket',
  aliases: ['tremove'],
  usage: 'remove <user>',
  slashOptions: [
    {
      name: 'user',
      description: 'User to remove from the ticket',
      type: 6,
      required: true
    }
  ],
  async slashExecute(interaction, client) {
    const ticket = client.db.ticketTickets.getByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    if (ticket.status === "closed") {
      return interaction.reply({ components: [TicketUI.buildWarning("Ticket Closed", "Cannot remove users from a closed ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    const canRemove = await checkTicketPermission(interaction, client, ticket);
    if (!canRemove) {
      return interaction.reply({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to remove users from this ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    const userId = interaction.options.getUser("user").id;
    const isAdded = client.db.ticketTickets.isUserAdded(ticket.ticketId, userId);
    if (!isAdded) {
      return interaction.reply({ components: [TicketUI.buildError("User Not Found", "This user is not added to the ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    client.db.ticketTickets.removeUser(ticket.ticketId, userId, interaction.user.id);
    const TicketManager = require("../../utils/ticketManager");
    await TicketManager.removeUserFromTicketChannel(client, ticket, userId, interaction.user.id);
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.remove} User Removed\n\n<@${userId}> has been removed from this ticket`));
    await interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  },
  async execute(message, args, client, prefix) {
    const ticket = client.db.ticketTickets.getByChannel(message.channel.id);
    if (!ticket) {
      return message.channel.send({ components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")], flags: MessageFlags.IsComponentsV2 });
    }
    if (ticket.status === "closed") {
      return message.channel.send({ components: [TicketUI.buildWarning("Ticket Closed", "Cannot remove users from a closed ticket.")], flags: MessageFlags.IsComponentsV2 });
    }
    const canRemove = await checkTicketPermission(message, client, ticket);
    if (!canRemove) {
      return message.channel.send({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to remove users from this ticket.")], flags: MessageFlags.IsComponentsV2 });
    }

    const addedUsers = client.db.ticketTickets.getAddedUsers(ticket.ticketId);
    if (addedUsers.length === 0) {
      return message.channel.send({ components: [TicketUI.buildError("No Added Users", "There are no added users to remove from this ticket.")], flags: MessageFlags.IsComponentsV2 });
    }

    let userId = null;
    if (args.length > 0) {
      const mention = args[0].match(/^<@!?(\d+)>$/);
      userId = mention ? mention[1] : args[0];
    }

    if (!userId) {
      const opts = addedUsers.map(u => ({ label: u.userId, value: u.userId, description: `Added by ${u.addedBy}` }));
      const c = new ContainerBuilder();
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.remove} Remove User\n\nSelect a user to remove from this ticket`));
      c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(`remove_user_select_${ticket.ticketId}`).setPlaceholder("Select a user").addOptions(opts)
      ));
      c.addSeparatorComponents(new SeparatorBuilder());
      c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`remove_cancel_${ticket.ticketId}`).setLabel("Cancel").setStyle(ButtonStyle.Secondary)
      ));

      const msg = await message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
      const col = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
      col.on("collect", async i => {
        if (i.customId === `remove_user_select_${ticket.ticketId}`) {
          await i.deferUpdate();
          userId = i.values[0];
          await this.executeRemove(message, client, ticket, userId);
          col.stop();
        } else if (i.customId.startsWith("remove_cancel")) {
          await i.update({ components: [TicketUI.buildInfo("Action Cancelled", "The remove request has been cancelled.")], flags: MessageFlags.IsComponentsV2 });
          col.stop();
        }
      });
      return;
    }
    await this.executeRemove(message, client, ticket, userId);
  },
  async executeRemove(message, client, ticket, userId) {
    const isAdded = client.db.ticketTickets.isUserAdded(ticket.ticketId, userId);
    if (!isAdded) {
      return message.channel.send({ components: [TicketUI.buildError("User Not Found", "This user is not added to the ticket.")], flags: MessageFlags.IsComponentsV2 });
    }
    client.db.ticketTickets.removeUser(ticket.ticketId, userId, message.author.id);
    const TicketManager = require("../../utils/ticketManager");
    await TicketManager.removeUserFromTicketChannel(client, ticket, userId, message.author.id);
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.remove} User Removed\n\n<@${userId}> has been removed from this ticket`));
    await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
