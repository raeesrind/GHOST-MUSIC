module.exports = {
  name: "channelDelete",
  run: async (client, channel) => {
    if (!channel.guild) return;
    try {
      const ticket = client.db.ticketTickets.getByChannel(channel.id);
      if (!ticket) return;
      client.db.ticketTickets.delete(ticket.ticketId);
      client.logger.log(`[Ticket] ${ticket.ticketId} removed from DB due to channel deletion`, "log");
    } catch (error) {}
  }
};
