const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'epoll',
  description: 'Ends an active poll',
  category: 'Polls',
  usage: 'epoll <messageID>',
  userPerms: ['ManageGuild'],
  botPerms: ['ManageGuild'],
  slashOptions: [
    { name: 'message_id', description: 'The ID of the poll message', type: 3, required: true }
  ],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const messageId = interaction.options.getString('message_id');
    return this.endPoll(interaction, messageId, client);
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    if (!args[0]) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.info} **Usage:** \`epoll <messageID>\``))], flags: MessageFlags.IsComponentsV2 });
    }
    const wrapper = {
      guild: message.guild,
      channel: message.channel,
      user: message.author,
      reply: (opts) => message.reply(opts),
      isSlash: false
    };
    return this.endPoll(wrapper, args[0], client);
  },

  async endPoll(ctx, messageId, client) {
    const confirmId = `epoll_confirm_${Date.now()}`;
    const cancelId = `epoll_cancel_${Date.now()}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(confirmId).setLabel('Confirm').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.warn} End Poll Confirmation\n-# Requested by ${ctx.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Are you sure you want to end the poll with message ID \`${messageId}\`?`));

    const reply = await ctx.reply({ components: [container, row], flags: MessageFlags.IsComponentsV2, fetchReply: true });

    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000, filter: i => i.user.id === ctx.user.id });

    collector.on('collect', async (i) => {
      if (i.customId === cancelId) {
        collector.stop('cancelled');
        const cancelDisplay = new TextDisplayBuilder().setContent(`${emoji.cross} Action cancelled.`);
        return i.update({ components: [new ContainerBuilder().addTextDisplayComponents(cancelDisplay)], flags: MessageFlags.IsComponentsV2 });
      }

      if (i.customId === confirmId) {
        collector.stop('confirmed');
        await i.deferUpdate();

        try {
          const channel = ctx.channel;
          const msg = await channel.messages.fetch(messageId).catch(() => null);
          if (!msg) {
            return i.editReply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Could not find a message with that ID.`))], flags: MessageFlags.IsComponentsV2 });
          }

          await msg.endPoll().catch(() => {});
          const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Poll Ended\n-# Requested by ${ctx.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} The poll has been ended.`));
          return i.editReply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {
          return i.editReply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Failed to end poll: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
        }
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        const timeoutDisplay = new TextDisplayBuilder().setContent(`${emoji.cross} This confirmation has timed out.`);
        reply.edit({ components: [new ContainerBuilder().addTextDisplayComponents(timeoutDisplay)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    });
  }
};
