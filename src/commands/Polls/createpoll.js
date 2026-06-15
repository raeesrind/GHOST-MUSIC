const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const sessions = new Map();
const MAX_OPTIONS = 10;

module.exports = {
  name: 'createpoll',
  description: 'Build and launch a Discord poll',
  category: 'Polls',
  usage: 'createpoll',
  userPerms: ['ManageGuild'],
  botPerms: ['ManageGuild'],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    return this.startBuilder(interaction, client);
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const wrapper = {
      guild: message.guild,
      channel: message.channel,
      user: message.author,
      reply: (opts) => message.reply(opts),
      isSlash: false
    };
    return this.startBuilder(wrapper, client);
  },

  async startBuilder(ctx, client) {
    const session = { question: null, options: [] };
    const container = this.buildContainer(session);

    const reply = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });
    sessions.set(reply.id, session);

    const collector = reply.createMessageComponentCollector({ time: 300000, filter: i => i.user.id === ctx.user.id });

    collector.on('collect', async (i) => {
      const s = sessions.get(reply.id) || { question: null, options: [] };

      try {
        if (i.customId === 'poll_set_question') {
          const modal = new ModalBuilder().setCustomId('poll_question_modal').setTitle('Set Poll Question');
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('poll_question_input').setLabel('Question').setStyle(TextInputStyle.Short).setPlaceholder('What do you want to ask?').setMaxLength(300).setRequired(true).setValue(s.question || '')
          ));
          await i.showModal(modal);
          const submit = await i.awaitModalSubmit({ time: 60000, filter: mi => mi.user.id === ctx.user.id && mi.customId === 'poll_question_modal' }).catch(() => null);
          if (!submit) return;
          s.question = submit.fields.getTextInputValue('poll_question_input').trim();
          await submit.deferUpdate();
          await reply.edit({ components: [this.buildContainer(s)] });

        } else if (i.customId === 'poll_add_option') {
          if (s.options.length >= MAX_OPTIONS) {
            return i.reply({ content: `${emoji.warn} Maximum of ${MAX_OPTIONS} options reached.`, flags: MessageFlags.Ephemeral });
          }
          const modal = new ModalBuilder().setCustomId('poll_option_modal').setTitle('Add Option');
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('poll_option_input').setLabel('Option Text').setStyle(TextInputStyle.Short).setPlaceholder('Enter an answer option...').setMaxLength(55).setRequired(true)
          ));
          await i.showModal(modal);
          const submit = await i.awaitModalSubmit({ time: 60000, filter: mi => mi.user.id === ctx.user.id && mi.customId === 'poll_option_modal' }).catch(() => null);
          if (!submit) return;
          s.options.push(submit.fields.getTextInputValue('poll_option_input').trim());
          await submit.deferUpdate();
          await reply.edit({ components: [this.buildContainer(s)] });

        } else if (i.customId === 'poll_remove_option') {
          s.options.splice(parseInt(i.values[0]), 1);
          await i.deferUpdate();
          await reply.edit({ components: [this.buildContainer(s)] });

        } else if (i.customId === 'poll_launch') {
          if (!s.question || s.options.length < 2) {
            return i.reply({ content: `${emoji.warn} A question and at least 2 options are required.`, flags: MessageFlags.Ephemeral });
          }
          await i.deferUpdate();
          await (ctx.channel || i.channel).send({
            poll: {
              question: { text: s.question },
              answers: s.options.map(text => ({ text })),
              duration: 24,
              allowMultiselect: false
            }
          });
          collector.stop('launched');
          const done = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Poll Launched\nYour poll has been posted in this channel.`));
          await reply.edit({ components: [done] });

        } else if (i.customId === 'poll_cancel') {
          await i.deferUpdate();
          collector.stop('cancelled');
          const done = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.cross} Cancelled\nYour poll session has been discarded.`));
          await reply.edit({ components: [done] });
        }
      } catch (err) {
        console.error('CreatePoll interaction error:', err);
      }
    });

    collector.on('end', (_, reason) => {
      sessions.delete(reply.id);
      if (reason === 'launched' || reason === 'cancelled') return;
    });
  },

  buildContainer(session) {
    const container = new ContainerBuilder();
    const questionLine = session.question
      ? `**Question**\n> ${session.question}`
      : `**Question**\n> Not set — click Set Question to begin`;
    const optionsLine = session.options.length > 0
      ? `\n\n**Options**\n` + session.options.map((o, i) => `> ${i + 1}. ${o}`).join('\n')
      : `\n\n**Options**\n> No options added yet`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Poll Builder`));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${questionLine}${optionsLine}\n\n-# ${session.options.length} / ${MAX_OPTIONS} options`));
    container.addSeparatorComponents(new SeparatorBuilder());

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('poll_set_question').setLabel(session.question ? 'Edit Question' : 'Set Question').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('poll_add_option').setLabel('Add Option').setStyle(ButtonStyle.Secondary).setDisabled(session.options.length >= MAX_OPTIONS),
      new ButtonBuilder().setCustomId('poll_launch').setLabel('Launch Poll').setStyle(ButtonStyle.Success).setDisabled(!session.question || session.options.length < 2),
      new ButtonBuilder().setCustomId('poll_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );
    container.addActionRowComponents(buttons);

    if (session.options.length > 0) {
      const removeSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('poll_remove_option').setPlaceholder('Remove an option...').addOptions(
          session.options.map((opt, i) => new StringSelectMenuOptionBuilder().setLabel(opt.length > 100 ? opt.slice(0, 97) + '...' : opt).setDescription(`Remove option ${i + 1}`).setValue(String(i)))
        )
      );
      container.addActionRowComponents(removeSelect);
    }

    return container;
  }
};
