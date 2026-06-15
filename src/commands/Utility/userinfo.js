const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    PermissionFlagsBits,
    AuditLogEvent
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "userinfo",
    category: "Utility",
    description: "Get detailed information about a user",
    aliases: ["ui", "whois", "user"],
    args: false,
    usage: "userinfo [user]",
    permission: [],
    slashOptions: [
        {
            name: 'user',
            description: 'The user to get information about',
            type: 6,
            required: false
        }
    ],

    async slashExecute(interaction, client) {
        return module.exports.runInfo(interaction, client, true);
    },

    async execute(message, args, client) {
        return module.exports.runInfo(message, client, false, args);
    },

    async runInfo(context, client, isSlash, args = []) {
        const guild = context.guild;
        const author = isSlash ? context.user : context.author;

        if (isSlash && !context.deferred) await context.deferReply();

        let target;
        if (isSlash) {
            target = context.options.getUser("user") || author;
        } else {
            target = context.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : author);
        }

        if (!target) {
            const errorDisplay = new TextDisplayBuilder().setContent(`${emoji.cross} **Could not find that user.**`);
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const options = { components: [container], flags: MessageFlags.IsComponentsV2 };
            return isSlash ? context.editReply(options) : context.reply(options);
        }

        const member = await guild.members.fetch(target.id).catch(() => null);

        try {
            const createdAt = Math.floor(target.createdTimestamp / 1000);
            const joinedAt = member ? Math.floor(member.joinedTimestamp / 1000) : null;

            const getMainContainer = () => {
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### \`${target.username}'s\` Info\n-# Requested by ${author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`));
                container.addSeparatorComponents(new SeparatorBuilder());


                const generalSection = new SectionBuilder();
                generalSection.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${emoji.hastag} **__General__**\n` +
                    `> **Name :** ${target.displayName}\n` +
                    `> **Username :** ${target.username}\n` +
                    `> **ID :** ${target.id}\n` +
                    `> **Nickname :** ${member?.nickname || "None"}\n` +
                    `> **Is Bot :** ${target.bot ? "Yes" : "No"}\n` +
                    `> **Account Created :** <t:${createdAt}:R>\n` +
                    (joinedAt ? `> **Server Joined :** <t:${joinedAt}:R>` : "")
                ));

                generalSection.setThumbnailAccessory((thumbnail) =>
                    thumbnail.setURL(target.displayAvatarURL({ size: 256, dynamic: true }))
                );

                container.addSectionComponents(generalSection);

                if (member) {
                    const roles = member.roles.cache
                        .filter(r => r.name !== "@everyone")
                        .sort((a, b) => b.position - a.position);

                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${emoji.hastag} **__Roles__**\n` +
                        `> **Top Role :** ${member.roles.highest.id === guild.id ? "@everyone" : `<@&${member.roles.highest.id}>`}\n` +
                        `> **Total Roles :** ${roles.size}`
                    ));
                }

                if (member) {
                    const customStatus = member.presence?.activities.find(a => a.type === 4);
                    const customText = customStatus ?
                        `${customStatus.emoji ? customStatus.emoji.toString() + " " : ""}${customStatus.state || ""}` :
                        "None";

                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${emoji.hastag} **__Presence__**\n` +
                        `> **Status :** ${member.presence?.status ? member.presence.status.charAt(0).toUpperCase() + member.presence.status.slice(1) : "Offline"}\n` +
                        `> **Custom :** ${customText}\n` +
                        `> **Device :** ${member.presence?.clientStatus ? Object.keys(member.presence.clientStatus).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ") : "None"}`
                    ));

                    const voiceChannel = member.voice.channel;
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${emoji.hastag} **__Extras__**\n` +
                        `> **Boosting :** ${member.premiumSince ? "Yes" : "No"}\n` +
                        `> **In VC :** ${voiceChannel ? voiceChannel.name : "No"}`
                    ));
                }

                if (member) {
                    const keyPermissions = [
                        { flag: PermissionFlagsBits.Administrator, name: "Administrator" },
                        { flag: PermissionFlagsBits.ManageGuild, name: "Manage Guild" },
                        { flag: PermissionFlagsBits.ManageRoles, name: "Manage Roles" },
                        { flag: PermissionFlagsBits.ManageChannels, name: "Manage Channels" },
                        { flag: PermissionFlagsBits.ManageMessages, name: "Manage Messages" },
                        { flag: PermissionFlagsBits.ManageWebhooks, name: "Manage Webhooks" },
                        { flag: PermissionFlagsBits.ManageNicknames, name: "Manage Nicknames" },
                        { flag: PermissionFlagsBits.ManageEmojisAndStickers, name: "Manage Emojis" },
                        { flag: PermissionFlagsBits.KickMembers, name: "Kick Members" },
                        { flag: PermissionFlagsBits.BanMembers, name: "Ban Members" },
                        { flag: PermissionFlagsBits.MentionEveryone, name: "Mention Everyone" }
                    ];

                    const userPerms = keyPermissions
                        .filter(p => member.permissions.has(p.flag))
                        .map(p => p.name);

                    if (userPerms.length > 0) {
                        const permsDisplay = userPerms.map(p => `**${p}**`).join(", ");
                        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${emoji.hastag} **__Key Perms__**\n` +
                            `> ${permsDisplay}`
                        ));
                    }
                }

                if (member) {
                    let acknowledgment = "Member";
                    if (guild.ownerId === target.id) acknowledgment = "Server Owner";
                    else if (member.permissions.has(PermissionFlagsBits.Administrator)) acknowledgment = "Server Admin";
                    else if (member.permissions.has(PermissionFlagsBits.ManageMessages)) acknowledgment = "Server Moderator";

                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${emoji.hastag} **__Acknowledgement__**\n` +
                        `> **${acknowledgment}**`
                    ));
                }

                return container;
            };

            const getAvatarContainer = () => {
                const avatarURL = target.displayAvatarURL({ size: 1024, dynamic: true });
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${target.username}'s Avatar`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`[\`Download\`](${avatarURL})`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(avatarURL)));
                return container;
            };

            const getBannerContainer = async () => {
                const user = await client.users.fetch(target.id, { force: true });
                const bannerURL = user.bannerURL({ size: 1024, extension: 'png' }) || "No Banner";
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${target.username}'s Banner`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`[\`Download\`](${bannerURL})`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerURL)));
                return container;
            };

            const getButtons = async (currentView) => {
                const row = new ActionRowBuilder();
                if (currentView === 'main') {
                    row.addComponents(new ButtonBuilder().setCustomId('view_avatar').setLabel('Avatar').setStyle(ButtonStyle.Secondary));
                    const user = await client.users.fetch(target.id, { force: true });
                    if (user.bannerURL()) row.addComponents(new ButtonBuilder().setCustomId('view_banner').setLabel('Banner').setStyle(ButtonStyle.Secondary));

                    const isMod = context.member?.permissions?.has(PermissionFlagsBits.ModerateMembers) ||
                                  context.member?.permissions?.has(PermissionFlagsBits.BanMembers) ||
                                  context.member?.permissions?.has(PermissionFlagsBits.KickMembers) ||
                                  context.member?.permissions?.has(PermissionFlagsBits.ManageMessages) ||
                                  context.member?.permissions?.has(PermissionFlagsBits.Administrator);

                    if (isMod) {
                        let isBanned = false;
                        try {
                            await guild.bans.fetch(target.id);
                            isBanned = true;
                        } catch {}
                        if (isBanned) {
                            row.addComponents(new ButtonBuilder()
                                .setCustomId(`ban_info_${target.id}`)
                                .setLabel('Ban Info')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji(emoji.ban)
                            );
                        }

                        const isTimedOut = member?.communicationDisabledUntilTimestamp > Date.now();
                        if (isTimedOut) {
                            row.addComponents(new ButtonBuilder()
                                .setCustomId(`timeout_info_${target.id}`)
                                .setLabel('Timeout Info')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji(emoji.timeout)
                            );
                        }
                    }
                } else {
                    row.addComponents(new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Primary));
                }
                return row.components.length > 0 ? row : null;
            };

            const handleBanInfo = async (interaction) => {
                try {
                    const banData = await guild.bans.fetch(target.id);
                    let bannedBy = 'Unknown';
                    let banReason = banData.reason || 'No reason provided';
                    let bannedOn = 'Unknown';

                    try {
                        const auditLogs = await guild.fetchAuditLogs({
                            type: AuditLogEvent.MemberBanAdd,
                            limit: 10
                        });
                        const entry = auditLogs.entries.find(e => e.target.id === target.id);
                        if (entry) {
                            bannedBy = entry.executor?.tag || 'Unknown';
                            banReason = entry.reason || banData.reason || 'No reason provided';
                            bannedOn = entry.createdAt
                                ? `<t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>`
                                : 'Unknown';
                        }
                    } catch {}

                    const targetTag = target.tag || `${target.username}#${target.discriminator}`;

                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${emoji.ban} **Ban Info**\n-# Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:t>`
                        ))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `${emoji.user} **User :** ${targetTag}\n` +
                                    `${emoji.id} **User ID :** ${target.id}\n` +
                                    `${emoji.reason} **Reason :** ${banReason}\n` +
                                    `${emoji.mod} **Banned By :** ${bannedBy}\n` +
                                    `${emoji.date} **Banned On :** ${bannedOn}`
                                ))
                                .setThumbnailAccessory((thumbnail) =>
                                    thumbnail.setURL(target.displayAvatarURL({ size: 256, dynamic: true }))
                                )
                        );

                    await interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${emoji.warn} **Error :** Missing permissions to fetch this info`
                        ));
                    await interaction.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            };

            const handleTimeoutInfo = async (interaction) => {
                const expiresAt = Math.floor(member.communicationDisabledUntilTimestamp / 1000);

                let timedOutBy = 'Unknown';
                let timeoutReason = 'No reason provided';

                try {
                    const auditLogs = await guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberUpdate,
                        limit: 10
                    });
                    const entry = auditLogs.entries.find(e =>
                        e.target.id === target.id &&
                        e.changes?.some(c => c.key === 'communication_disabled_until')
                    );
                    if (entry) {
                        timedOutBy = entry.executor?.tag || 'Unknown';
                        timeoutReason = entry.reason || 'No reason provided';
                    }
                } catch {}

                const targetTag = target.tag || `${target.username}#${target.discriminator}`;

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `${emoji.timeout} **Timeout Info**\n-# Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:t>`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${emoji.user} **User :** ${targetTag}\n` +
                                `${emoji.id} **User ID :** ${target.id}\n` +
                                `${emoji.clock} **Expires :** <t:${expiresAt}:R>\n` +
                                `${emoji.mod} **Timed Out By :** ${timedOutBy}\n` +
                                `${emoji.reason} **Reason :** ${timeoutReason}`
                            ))
                            .setThumbnailAccessory((thumbnail) =>
                                thumbnail.setURL(target.displayAvatarURL({ size: 256, dynamic: true }))
                            )
                    );

                await interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            };

            const initialComponents = [getMainContainer()];
            const initialRow = await getButtons('main');
            if (initialRow) initialComponents.push(initialRow);

            const options = {
                components: initialComponents,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            };

            const msg = isSlash ? await context.editReply(options) : await context.reply(options);

            const collector = msg.createMessageComponentCollector({
                filter: (i) => i.user.id === author.id,
                time: 60000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === `ban_info_${target.id}`) {
                    return handleBanInfo(interaction);
                }

                if (interaction.customId === `timeout_info_${target.id}`) {
                    return handleTimeoutInfo(interaction);
                }

                let updatedContainer;
                let currentView;

                if (interaction.customId === 'view_avatar') {
                    updatedContainer = getAvatarContainer();
                    currentView = 'avatar';
                } else if (interaction.customId === 'view_banner') {
                    updatedContainer = await getBannerContainer();
                    currentView = 'banner';
                } else if (interaction.customId === 'back') {
                    updatedContainer = getMainContainer();
                    currentView = 'main';
                }

                const updatedRow = await getButtons(currentView);
                const finalComponents = [updatedContainer];
                if (updatedRow) finalComponents.push(updatedRow);

                await interaction.update({
                    components: finalComponents,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] }
                });
            });

            collector.on('end', async () => {
                const disabledRow = await getButtons('main');
                if (disabledRow) {
                    disabledRow.components.forEach(b => b.setDisabled(true));
                    msg.edit({
                        components: [getMainContainer(), disabledRow],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { parse: [] }
                    }).catch(() => { });
                }
            });

        } catch (error) {
            console.error("Error in userinfo command:", error);
            const errorDisplay = new TextDisplayBuilder().setContent(`${emoji.warn} An error occurred while fetching user information.`);
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            const errOptions = { components: [container], flags: MessageFlags.IsComponentsV2 };
            if (isSlash) return context.editReply(errOptions);
            else return context.reply(errOptions);
        }
    }
};
