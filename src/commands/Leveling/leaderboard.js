const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const emoji = require('../../emojis');
const { calculateLevel, formatXp } = require('../../utils/xpMath');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'Show the server XP leaderboard.',
    category: 'Leveling',
    args: false,
    usage: 'leaderboard',

    async execute(message, args, client) {
        const guild = message.guild;
        const author = message.author;

        const rows = client.db.leveling.getAllUserXp(guild.id);
        if (!rows.length) {
            const display = new TextDisplayBuilder().setContent(`${emoji.warn} No XP data available yet.`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { users: [] }
            });
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(rows.length / itemsPerPage);
        let currentPage = 0;

        const createContainer = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = rows.slice(start, end);
            const container = new ContainerBuilder();

            const header = new TextDisplayBuilder().setContent(`### ${client.emoji.check} Leaderboard list [${rows.length}]`);
            container.addTextDisplayComponents(header);
            container.addSeparatorComponents(new SeparatorBuilder());

            const content = currentItems.map((row, i) => {
                const userLevel = calculateLevel(row.xp);
                const globalRank = start + i + 1;
                return `**\`${String(globalRank).padStart(2, '0')}.\`** : \u200B<@${row.user_id}> - Level ${userLevel} (${formatXp(row.xp)} XP)`;
            }).join('\n');
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());

            const footer = new TextDisplayBuilder().setContent(`\n-# Page ${page + 1}/${totalPages} | Requested by ${author.displayName}`);
            container.addTextDisplayComponents(footer);

            return container;
        };

        const getButtons = () => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('home').setLabel('Home').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
            );
        };

        const buttonRow = getButtons();
        const components = [createContainer(currentPage)];
        if (totalPages > 1) components.push(buttonRow);

        const msg = await message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { users: [] }
        });

        if (totalPages <= 1) return;

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 60000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'close') {
                return interaction.message.delete().catch(() => { });
            }

            if (interaction.customId === 'home') currentPage = 0;
            if (interaction.customId === 'prev') currentPage = (currentPage - 1 + totalPages) % totalPages;
            if (interaction.customId === 'next') currentPage = (currentPage + 1) % totalPages;

            const updatedComponents = [createContainer(currentPage)];
            if (totalPages > 1) updatedComponents.push(buttonRow);

            await interaction.update({
                components: updatedComponents,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { users: [] }
            });
        });

        collector.on('end', () => {
            msg.edit({
                components: [createContainer(currentPage)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { users: [] }
            }).catch(() => { });
        });
    },

    async slashExecute(interaction, client) {
        await interaction.deferReply();
        const guild = interaction.guild;
        const author = interaction.user;

        const rows = client.db.leveling.getAllUserXp(guild.id);
        if (!rows.length) {
            const display = new TextDisplayBuilder().setContent(`${emoji.warn} No XP data available yet.`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { users: [] }
            });
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(rows.length / itemsPerPage);
        let currentPage = 0;

        const createContainer = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = rows.slice(start, end);
            const container = new ContainerBuilder();

            const header = new TextDisplayBuilder().setContent(`### ${client.emoji.check} Leaderboard list [${rows.length}]`);
            container.addTextDisplayComponents(header);
            container.addSeparatorComponents(new SeparatorBuilder());

            const content = currentItems.map((row, i) => {
                const userLevel = calculateLevel(row.xp);
                const globalRank = start + i + 1;
                return `**\`${String(globalRank).padStart(2, '0')}.\`** : \u200B<@${row.user_id}> - Level ${userLevel} (${formatXp(row.xp)} XP)`;
            }).join('\n');
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder());

            const footer = new TextDisplayBuilder().setContent(`\n-# Page ${page + 1}/${totalPages} | Requested by ${author.displayName}`);
            container.addTextDisplayComponents(footer);

            return container;
        };

        const getButtons = () => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('home').setLabel('Home').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
            );
        };

        const buttonRow = getButtons();
        const components = [createContainer(currentPage)];
        if (totalPages > 1) components.push(buttonRow);

        const msg = await interaction.editReply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { users: [] }
        });

        if (totalPages <= 1) return;

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 60000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'close') {
                return interaction.message.delete().catch(() => { });
            }

            if (interaction.customId === 'home') currentPage = 0;
            if (interaction.customId === 'prev') currentPage = (currentPage - 1 + totalPages) % totalPages;
            if (interaction.customId === 'next') currentPage = (currentPage + 1) % totalPages;

            const updatedComponents = [createContainer(currentPage)];
            if (totalPages > 1) updatedComponents.push(buttonRow);

            await interaction.update({
                components: updatedComponents,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { users: [] }
            });
        });

        collector.on('end', () => {
            msg.edit({
                components: [createContainer(currentPage)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { users: [] }
            }).catch(() => { });
        });
    }
};