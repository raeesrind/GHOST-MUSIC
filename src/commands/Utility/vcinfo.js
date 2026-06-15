const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ChannelType } = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
  name: 'vcinfo',
  aliases: ['voiceinfo'],
  description: 'Displays the information about a voice channel',
  category: 'Utility',
  usage: 'vcinfo [channel]',
  slashOptions: [
    { name: 'channel', description: 'The voice channel to inspect', type: 7, required: false }
  ],

  async slashExecute(interaction, client) {
    let channel = interaction.options.getChannel('channel');
    if (!channel) channel = interaction.member.voice.channel;
    if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
      return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Please specify a valid voice channel or join one.`))], flags: MessageFlags.IsComponentsV2 });
    }
    return this.showInfo(interaction, channel, client);
  },

  async execute(message, args, client) {
    let channel = message.member.voice.channel;
    if (args.length > 0) {
      const id = args[0].replace(/[<#>]/g, '');
      channel = message.guild.channels.cache.get(id) || channel;
    }
    if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
      return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} Please specify a valid voice channel or join one.`))], flags: MessageFlags.IsComponentsV2 });
    }
    const wrapper = { guild: message.guild, user: message.author, reply: (opts) => message.reply(opts), isSlash: false };
    return this.showInfo(wrapper, channel, client);
  },

  async showInfo(ctx, channel, client) {
    const members = channel.members;
    const bitrate = channel.bitrate / 1000;
    const userLimit = channel.userLimit || 'Unlimited';
    const createdAt = Math.floor(channel.createdTimestamp / 1000);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.hastag} Voice Channel Info\n-# Requested by ${ctx.user.displayName} • <t:${Math.floor(Date.now() / 1000)}:t>`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${emoji.wickarrow} **Name:** ${channel.name}\n` +
        `${emoji.wickarrow} **ID:** ${channel.id}\n` +
        `${emoji.wickarrow} **Bitrate:** ${bitrate} kbps\n` +
        `${emoji.wickarrow} **User Limit:** ${userLimit}\n` +
        `${emoji.wickarrow} **Members:** ${members.size}/${userLimit === 'Unlimited' ? '∞' : userLimit}\n` +
        `${emoji.wickarrow} **Created:** <t:${createdAt}:R>\n` +
        (channel.rtcRegion ? `${emoji.wickarrow} **Region:** ${channel.rtcRegion}\n` : '') +
        (members.size > 0 ? `${emoji.wickarrow} **Connected Users:**\n${members.map(m => `${emoji.blank}${emoji.wickarrow} <@${m.id}>`).join('\n')}` : '')
      ));
    await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
