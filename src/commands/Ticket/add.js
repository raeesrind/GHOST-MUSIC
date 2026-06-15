const {
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
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
  name: 'add',
  category: 'Ticket',
  description: 'Add a user to the ticket',
  aliases: ['tadd'],
  usage: 'add <user>',
  slashOptions: [
    {
      name: 'user',
      description: 'User to add to the ticket',
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
      return interaction.reply({ components: [TicketUI.buildWarning("Ticket Closed", "Cannot add users to a closed ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    const canAdd = await checkTicketPermission(interaction, client, ticket);
    if (!canAdd) {
      return interaction.reply({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to add users to this ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    const userId = interaction.options.getUser("user").id;
    if (userId === ticket.userId) {
      return interaction.reply({ components: [TicketUI.buildWarning("Invalid User", "The ticket creator is already part of this ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    const addedUsers = client.db.ticketTickets.getAddedUsers(ticket.ticketId);
    if (addedUsers.length >= 5) {
      return interaction.reply({ components: [TicketUI.buildWarning("Maximum Users Reached", "A maximum of 5 users can be added to a ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    const isAlreadyAdded = client.db.ticketTickets.isUserAdded(ticket.ticketId, userId);
    if (isAlreadyAdded) {
      return interaction.reply({ components: [TicketUI.buildInfo("User Already Added", "This user already has access to the ticket.")], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    client.db.ticketTickets.addUser(ticket.ticketId, userId, interaction.user.id);
    const TicketManager = require("../../utils/ticketManager");
    await TicketManager.addUserToTicketChannel(client, ticket, userId, interaction.user.id);
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.add} User Added\n\n<@${userId}> has been granted access to this ticket`));
    await interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  },
  async execute(message, args, client, prefix) {
    const ticket = client.db.ticketTickets.getByChannel(message.channel.id);
    if (!ticket) {
      return message.channel.send({ components: [TicketUI.buildError("Invalid Channel", "This is not a ticket channel.")], flags: MessageFlags.IsComponentsV2 });
    }
    if (ticket.status === "closed") {
      return message.channel.send({ components: [TicketUI.buildWarning("Ticket Closed", "Cannot add users to a closed ticket.")], flags: MessageFlags.IsComponentsV2 });
    }
    const canAdd = await checkTicketPermission(message, client, ticket);
    if (!canAdd) {
      return message.channel.send({ components: [TicketUI.buildError("Permission Denied", "You don't have permission to add users to this ticket.")], flags: MessageFlags.IsComponentsV2 });
    }

    let userId = null;
    if (args.length > 0) {
      const mention = args[0].match(/^<@!?(\d+)>$/);
      userId = mention ? mention[1] : args[0];
    }

    if (!userId) {
      const c = new ContainerBuilder();
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.add} Add User\n\nSelect a user to add to this ticket`));
      c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder().setCustomId(`add_user_select_${ticket.ticketId}`).setPlaceholder("Select a user").setMaxValues(1)
      ));
      c.addSeparatorComponents(new SeparatorBuilder());
      c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`add_cancel_${ticket.ticketId}`).setLabel("Cancel").setStyle(ButtonStyle.Secondary)
      ));

      const msg = await message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
      const col = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
      col.on("collect", async i => {
        if (i.customId === `add_user_select_${ticket.ticketId}`) {
          await i.deferUpdate();
          userId = i.values[0];
          await this.executeAdd(message, client, ticket, userId);
          col.stop();
        } else if (i.customId.startsWith("add_cancel")) {
          await i.update({ components: [TicketUI.buildInfo("Action Cancelled", "The add request has been cancelled.")], flags: MessageFlags.IsComponentsV2 });
          col.stop();
        }
      });
      return;
    }
    await this.executeAdd(message, client, ticket, userId);
  },
  async executeAdd(message, client, ticket, userId) {
    if (userId === ticket.userId) {
      return message.channel.send({ components: [TicketUI.buildWarning("Invalid User", "The ticket creator is already part of this ticket.")], flags: MessageFlags.IsComponentsV2 });
    }
    const addedUsers = client.db.ticketTickets.getAddedUsers(ticket.ticketId);
    if (addedUsers.length >= 5) {
      return message.channel.send({ components: [TicketUI.buildWarning("Maximum Users Reached", "A maximum of 5 users can be added to a ticket.")], flags: MessageFlags.IsComponentsV2 });
    }
    const isAlreadyAdded = client.db.ticketTickets.isUserAdded(ticket.ticketId, userId);
    if (isAlreadyAdded) {
      return message.channel.send({ components: [TicketUI.buildInfo("User Already Added", "This user already has access to the ticket.")], flags: MessageFlags.IsComponentsV2 });
    }
    client.db.ticketTickets.addUser(ticket.ticketId, userId, message.author.id);
    const TicketManager = require("../../utils/ticketManager");
    await TicketManager.addUserToTicketChannel(client, ticket, userId, message.author.id);
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.add} User Added\n\n<@${userId}> has been granted access to this ticket`));
    await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
