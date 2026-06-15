const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis');
const { greetConfigs } = require('../../utils/newFeaturesDb');
const sessions = new Map();

module.exports = {
  name: 'greetsetup',
  description: 'Set up greet messages for new members',
  category: 'Greet',
  usage: 'greetsetup',
  userPerms: ['ManageGuild'],

  async slashExecute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    return this.startSetup(interaction, client);
  },

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} You need \`Manage Guild\` permissions.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const wrapper = {
      guild: message.guild,
      channel: message.channel,
      user: message.author,
      member: message.member,
      reply: (opts) => message.reply(opts),
      isSlash: false
    };
    return this.startSetup(wrapper, client);
  },

  async startSetup(ctx, client) {
    if (greetConfigs.count(ctx.guild.id) >= 3) {
      const display = new TextDisplayBuilder().setContent(`${emoji.warn} Maximum of 3 greet channels reached. Use \`disablegreet\` to remove one.`);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`greet_simple_${ctx.user.id}`).setLabel('Simple').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`greet_container_${ctx.user.id}`).setLabel('Container').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`greet_cancel_${ctx.user.id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.settings} Greet Setup\n-# Requested by ${ctx.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Choose the type of greet message you want to create:\n\n**Simple**\nSend a plain text greet message.\n\n**Container**\nSend a greet message in a container format with a title, description, and colour.`
      ))
      .addActionRowComponents(row);

    const reply = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });
    sessions.set(reply.id, { guildId: ctx.guild.id, userId: ctx.user.id });

    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000, filter: i => i.user.id === ctx.user.id });

    collector.on('collect', async (i) => {
      if (i.customId === `greet_cancel_${ctx.user.id}`) {
        collector.stop();
        const done = new TextDisplayBuilder().setContent(`${emoji.cross} Setup cancelled.`);
        return i.update({ components: [new ContainerBuilder().addTextDisplayComponents(done)], flags: MessageFlags.IsComponentsV2 });
      }

      const isSimple = i.customId === `greet_simple_${ctx.user.id}`;
      const channelSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`greet_channel_${ctx.user.id}`)
          .setPlaceholder('Select a channel for greet messages')
          .addOptions(
            ctx.guild.channels.cache
              .filter(c => c.type === 0)
              .first(25)
              .map(c => new StringSelectMenuOptionBuilder().setLabel(c.name).setValue(c.id))
          )
      );

      await i.update({ components: [new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.info} Select the channel for greet messages:`))
        .addActionRowComponents(channelSelect)
      ], flags: MessageFlags.IsComponentsV2 });

      const channelSelectCollector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000, max: 1, filter: ci => ci.user.id === ctx.user.id });

      channelSelectCollector.on('collect', async (ci) => {
        const channelId = ci.values[0];
        sessions.set(reply.id, { ...sessions.get(reply.id), channelId, isSimple });

        if (isSimple) {
          const modal = new ModalBuilder().setCustomId(`greet_modal_${ctx.user.id}`).setTitle('Simple Greet Message');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('greet_message').setLabel('Greet Message').setStyle(TextInputStyle.Paragraph).setPlaceholder('Welcome {member_mention} to {guild_name}!').setRequired(true).setMaxLength(1000)
            )
          );
          await ci.showModal(modal);
          const modalSubmit = await ci.awaitModalSubmit({ time: 60000, filter: mi => mi.customId === `greet_modal_${ctx.user.id}` && mi.user.id === ctx.user.id }).catch(() => null);
          if (!modalSubmit) return;

          const message = modalSubmit.fields.getTextInputValue('greet_message');
          greetConfigs.set(ctx.guild.id, channelId, { style: 'simple', message });

          const done = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Greet Configured\n-# Requested by ${ctx.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Simple greet configured for <#${channelId}>`));
          await modalSubmit.reply({ components: [done], flags: MessageFlags.IsComponentsV2 });
          try { reply.delete().catch(() => {}); } catch {}
          collector.stop();
        } else {
          const modal = new ModalBuilder().setCustomId(`greet_container_modal_${ctx.user.id}`).setTitle('Container Greet');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('greet_title').setLabel('Title').setStyle(TextInputStyle.Short).setPlaceholder('Welcome!').setRequired(true).setMaxLength(100)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('greet_description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setPlaceholder('Welcome {member_mention} to {guild_name}!').setRequired(true).setMaxLength(1000)
            )
          );
          await ci.showModal(modal);
          const modalSubmit = await ci.awaitModalSubmit({ time: 60000, filter: mi => mi.customId === `greet_container_modal_${ctx.user.id}` && mi.user.id === ctx.user.id }).catch(() => null);
          if (!modalSubmit) return;

          const title = modalSubmit.fields.getTextInputValue('greet_title');
          const description = modalSubmit.fields.getTextInputValue('greet_description');
          greetConfigs.set(ctx.guild.id, channelId, { style: 'container', title, description });

          const done = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Greet Configured\n-# Requested by ${ctx.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.wickarrow} Container greet configured for <#${channelId}>`));
          await modalSubmit.reply({ components: [done], flags: MessageFlags.IsComponentsV2 });
          try { reply.delete().catch(() => {}); } catch {}
          collector.stop();
        }
      });
    });

    collector.on('end', () => {
      sessions.delete(reply.id);
    });
  }
};
