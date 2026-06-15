const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const BetterSqlite3 = require('better-sqlite3');

module.exports = {
    name: 'importxp',
    aliases: ['importlevel', 'importlb'],
    category: 'Owner',
    description: 'Import XP data from a replied ghost.db file into the bot database.',
    args: false,
    usage: 'importxp (reply to a message with ghost.db attached)',
    owner: true,

    async execute(message, args, client) {
        if (!client.owners.includes(message.author.id)) return;

        const attachment = message.reference?.messageId
            ? (await message.channel.messages.fetch(message.reference.messageId)).attachments.first()
            : null;

        if (!attachment) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Reply to a message containing the \`ghost.db\` file.`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!attachment.name.endsWith('.db')) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Attached file must be a \`.db\` file.`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const tempPath = path.join(__dirname, '..', '..', '..', 'temp_ghost_import.db');

        await message.channel.sendTyping();

        try {
            const response = await fetch(attachment.url);
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(tempPath, buffer);

            const ghostDb = new BetterSqlite3(tempPath, { readonly: true });
            const tableCheck = ghostDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_xp'").get();
            if (!tableCheck) {
                ghostDb.close();
                fs.unlinkSync(tempPath);
                const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} The provided database does not contain a \`user_xp\` table.`);
                const container = new ContainerBuilder().addTextDisplayComponents(display);
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const rows = ghostDb.prepare('SELECT guild_id, user_id, xp, xp_user, last_message_ts FROM user_xp').all();
            ghostDb.close();

            if (!rows.length) {
                fs.unlinkSync(tempPath);
                const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} No XP data found in the provided database.`);
                const container = new ContainerBuilder().addTextDisplayComponents(display);
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const importStmt = client.db.db.prepare(`
                INSERT INTO user_xp (guild_id, user_id, xp, xp_user, last_message_ts)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(guild_id, user_id) DO UPDATE SET
                    xp = excluded.xp,
                    xp_user = excluded.xp_user,
                    last_message_ts = excluded.last_message_ts
            `);

            const importMany = client.db.db.transaction((data) => {
                for (const row of data) {
                    importStmt.run(row.guild_id, row.user_id, row.xp, row.xp_user || 0, row.last_message_ts || 0);
                }
            });

            importMany(rows);

            fs.unlinkSync(tempPath);

            const totalXp = rows.reduce((sum, r) => sum + r.xp, 0);
            const guildCount = new Set(rows.map(r => r.guild_id)).size;
            const content = [
                `### ${client.emoji.check} Import Complete`,
                '',
                `**\`${rows.length}\`** users imported`,
                `**\`${guildCount}\`** guilds affected`,
                `${client.emoji.arrowright} Total XP: **${totalXp.toLocaleString()}**`
            ].join('\n');

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Database: \`${attachment.name}\``));

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            console.error('Import XP error:', error);
            const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Failed to import: ${error.message}`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    },

    async slashExecute(interaction, client) {
        if (!client.owners.includes(interaction.user.id)) return;
        await interaction.deferReply();

        const attachment = interaction.options.getAttachment('file');
        if (!attachment) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Provide a \`.db\` file attachment.`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!attachment.name.endsWith('.db')) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} File must be a \`.db\` file.`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const tempPath = path.join(__dirname, '..', '..', '..', 'temp_ghost_import.db');

        try {
            const response = await fetch(attachment.url);
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(tempPath, buffer);

            const ghostDb = new BetterSqlite3(tempPath, { readonly: true });
            const tableCheck = ghostDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_xp'").get();
            if (!tableCheck) {
                ghostDb.close();
                fs.unlinkSync(tempPath);
                const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Database does not contain a \`user_xp\` table.`);
                const container = new ContainerBuilder().addTextDisplayComponents(display);
                return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const rows = ghostDb.prepare('SELECT guild_id, user_id, xp, xp_user, last_message_ts FROM user_xp').all();
            ghostDb.close();

            if (!rows.length) {
                fs.unlinkSync(tempPath);
                const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} No XP data found.`);
                const container = new ContainerBuilder().addTextDisplayComponents(display);
                return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const importStmt = client.db.db.prepare(`
                INSERT INTO user_xp (guild_id, user_id, xp, xp_user, last_message_ts)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(guild_id, user_id) DO UPDATE SET
                    xp = excluded.xp,
                    xp_user = excluded.xp_user,
                    last_message_ts = excluded.last_message_ts
            `);

            const importMany = client.db.db.transaction((data) => {
                for (const row of data) {
                    importStmt.run(row.guild_id, row.user_id, row.xp, row.xp_user || 0, row.last_message_ts || 0);
                }
            });

            importMany(rows);

            fs.unlinkSync(tempPath);

            const totalXp = rows.reduce((sum, r) => sum + r.xp, 0);
            const guildCount = new Set(rows.map(r => r.guild_id)).size;
            const content = [
                `### ${client.emoji.check} Import Complete`,
                '',
                `**\`${rows.length}\`** users imported`,
                `**\`${guildCount}\`** guilds affected`,
                `${client.emoji.arrowright} Total XP: **${totalXp.toLocaleString()}**`
            ].join('\n');

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Database: \`${attachment.name}\``));

            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            console.error('Import XP error:', error);
            const display = new TextDisplayBuilder().setContent(`${client.emoji.cross} Failed to import: ${error.message}`);
            const container = new ContainerBuilder().addTextDisplayComponents(display);
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
