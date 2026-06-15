const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const emoji = require('../../emojis');

module.exports = {
    name: 'prefix',
    aliases: ['showprefix', 'getprefix', 'setprefix'],
    description: 'View or change the server prefix.',
    category: 'Utility',
    args: false,
    usage: "<new prefix>",
    userPerms: ["ManageGuild"],
    owner: false,

    getPrefix(client, guildId) {
        let prefix = client.prefix;
        try {
            const prefixData = client.db.prefixes.get(guildId);
            if (prefixData?.prefix) prefix = prefixData.prefix;
        } catch (err) {
            console.error(`[DB Error] prefixes.get:`, err);
        }
        return prefix;
    },

    async execute(message, args, client) {
        const currentPrefix = this.getPrefix(client, message.guild.id);

        if (!args[0]) {
            const display = new TextDisplayBuilder()
                .setContent(`${emoji.info} The current prefix for this server is **\`${currentPrefix}\`**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(display);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (args[0].toLowerCase() === 'help') {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.info} Prefix Command`));
            container.addSeparatorComponents(new SeparatorBuilder());

            const helpContent = `> ** \`${currentPrefix}prefix\` **\n╰ Shows the current prefix.\n\n` +
                `> ** \`${currentPrefix}prefix <new prefix>\` **\n╰ Changes the server prefix (max 3 characters).\n\n` +
                `> ** \`${currentPrefix}prefix help\` **\n╰ Shows this help message.`;

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(helpContent));
            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Requested by ${message.author.displayName || message.author.username}`));

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!message.member.permissions.has('ManageGuild')) {
            const display = new TextDisplayBuilder()
                .setContent(`${emoji.cross} You need **Manage Server** permission to change the prefix.`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(display);

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const newPrefix = args.join(" ");

        if (newPrefix.length > 3) {
            const display = new TextDisplayBuilder()
                .setContent(`${emoji.warn} Prefix can't exceed 3 characters.`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(display);

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            client.db.prefixes.set(message.guild.id, { prefix: newPrefix });
        } catch (err) {
            console.error(err);

            const display = new TextDisplayBuilder()
                .setContent(`${emoji.cross} An error occurred while updating the prefix:\n\`\`\`\n${err.message}\n\`\`\``);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(display);

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const display = new TextDisplayBuilder()
            .setContent(`${emoji.check} Prefix updated to **\`${newPrefix}\`**`);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(display);

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
