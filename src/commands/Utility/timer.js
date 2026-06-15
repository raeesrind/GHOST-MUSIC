const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require('discord.js');

const timerStore = new Map();

function parseDuration(str) {
    const units = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 };
    const match = str.toLowerCase().match(/^(\d+)([smhd])$/);
    return match ? parseInt(match[1]) * units[match[2]] : null;
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function buildStartComponents(client, title, endTimestamp, endTimeStr) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${client.emoji.duration} **Timer** ${client.emoji.duration}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${client.emoji.dot} Ends : <t:${endTimestamp}:R> (<t:${endTimestamp}:f>) ${client.emoji.dot}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Timer ends | Today at ${endTimeStr}`));
    return container;
}

function buildPausedComponents(client, title, pauseTimeStr) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${client.emoji.warn} **Timer paused** ${client.emoji.warn}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${client.emoji.blank}${client.emoji.wickarrow} **TIMER PAUSED** ${client.emoji.wickarrow}${client.emoji.blank}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Timer paused | Today at ${pauseTimeStr}`));
    return container;
}

function buildEndComponents(client, title, endTimestamp, endTimeStr) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${client.emoji.dance} **Timer Ended** ${client.emoji.dance}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${client.emoji.blank}${client.emoji.wickarrow} Timer ended at <t:${endTimestamp}:f> ${client.emoji.wickarrow}${client.emoji.blank}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Timer Ended | Today at ${endTimeStr}`));
    return container;
}

module.exports = {
    name: 'timer',
    description: 'Set, pause, resume, or end a timer for a specific duration.',
    category: 'Utility',
    usage: 'timer <duration> [label] | timer start/pause/resume/end <args>',
    example: 'timer 10m Take out the trash',
    aliases: ['remindme', 'tm', 'tstart', 'tpause', 'tresume', 'tend'],

    async execute(message, args, client) {
        if (!args.length) {
            const display = new TextDisplayBuilder().setContent(
                `${client.emoji.info} **Timer Commands**\n` +
                `${client.emoji.blank}${client.emoji.wickarrow} \`${client.prefix}timer <duration> [label]\` - Start a timer\n` +
                `${client.emoji.blank}${client.emoji.wickarrow} \`${client.prefix}timer pause <messageID>\` - Pause a timer\n` +
                `${client.emoji.blank}${client.emoji.wickarrow} \`${client.prefix}timer resume <messageID>\` - Resume a timer\n` +
                `${client.emoji.blank}${client.emoji.wickarrow} \`${client.prefix}timer end <messageID>\` - End a timer`
            );
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const sub = args[0].toLowerCase();

        if (sub === 'pause' || sub === 'p') {
            return handlePause(message, args.slice(1), client);
        }
        if (sub === 'resume' || sub === 'r') {
            return handleResume(message, args.slice(1), client);
        }
        if (sub === 'end' || sub === 'e') {
            return handleEnd(message, args.slice(1), client);
        }
        if (sub === 'start' || sub === 's') {
            return handleStart(message, args.slice(1), client);
        }

        return handleStart(message, args, client);
    }
};

async function handleStart(message, args, client) {
    const durationStr = args[0];
    const label = args.slice(1).join(' ') || 'Timer';

    if (!durationStr) {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} Please provide a duration! Format: \`.timer <duration> [label]\``
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} Invalid duration format! Use \`s\`, \`m\`, \`h\`, or \`d\`.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    if (durationMs > 86400000) {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} I can only set timers for up to 24 hours as they don't persist after restarts.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const endDate = new Date(Date.now() + durationMs);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);
    const endTimeStr = formatTime(endDate);

    const components = buildStartComponents(client, label, endTimestamp, endTimeStr);
    const reply = await message.reply({
        components: [components],
        flags: MessageFlags.IsComponentsV2
    });

    const timerId = setTimeout(async () => {
        try {
            const endedTimeStr = formatTime(new Date());
            const endComponents = buildEndComponents(client, label, endTimestamp, endedTimeStr);
            await reply.edit({ components: [endComponents], flags: MessageFlags.IsComponentsV2 });
            const entry = timerStore.get(reply.id);
            if (entry) { entry.status = 'ended'; timerStore.set(reply.id, entry); }
        } catch (err) {
            // ignore
        }
    }, durationMs);

    timerStore.set(reply.id, {
        title: label,
        endTimestamp,
        endTimeStr,
        remainingMs: durationMs,
        status: 'running',
        timerId,
        timerMsg: reply
    });
}

async function handlePause(message, args, client) {
    const messageId = args[0];
    if (!messageId) {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} Please provide the timer message ID. Usage: \`.timer pause <messageID>\``
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const timer = timerStore.get(messageId);
    if (!timer) {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.cross} No active timer found with that message ID.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    if (timer.status === 'paused') {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} That timer is already paused.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    if (timer.status === 'ended') {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} That timer has already ended.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    clearTimeout(timer.timerId);
    timer.remainingMs = timer.endTimestamp * 1000 - Date.now();
    timer.status = 'paused';
    timerStore.set(messageId, timer);

    const pauseTimeStr = formatTime(new Date());
    const pausedComponents = buildPausedComponents(client, timer.title, pauseTimeStr);

    await timer.timerMsg.edit({
        components: [pausedComponents],
        flags: MessageFlags.IsComponentsV2
    }).catch(() => null);

    const display = new TextDisplayBuilder().setContent(
        `${client.emoji.check} Timer paused successfully!`
    );
    await message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
}

async function handleResume(message, args, client) {
    const messageId = args[0];
    if (!messageId) {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} Please provide the timer message ID. Usage: \`.timer resume <messageID>\``
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const timer = timerStore.get(messageId);
    if (!timer) {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.cross} No timer found with that message ID.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    if (timer.status === 'running') {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} That timer is already running.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    if (timer.status === 'ended') {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} That timer has already ended.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const newEndDate = new Date(Date.now() + timer.remainingMs);
    const newEndTimestamp = Math.floor(newEndDate.getTime() / 1000);
    const newEndTimeStr = formatTime(newEndDate);

    timer.endTimestamp = newEndTimestamp;
    timer.status = 'running';
    timer.timerId = setTimeout(async () => {
        const endedTimeStr = formatTime(new Date());
        const endComponents = buildEndComponents(client, timer.title, newEndTimestamp, endedTimeStr);
        await timer.timerMsg.edit({
            components: [endComponents],
            flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
        timer.status = 'ended';
        timerStore.set(messageId, timer);
    }, timer.remainingMs);

    timerStore.set(messageId, timer);

    const resumedComponents = buildStartComponents(client, timer.title, newEndTimestamp, newEndTimeStr);
    await timer.timerMsg.edit({
        components: [resumedComponents],
        flags: MessageFlags.IsComponentsV2
    }).catch(() => null);

    const display = new TextDisplayBuilder().setContent(
        `${client.emoji.check} Timer resumed successfully!`
    );
    await message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
}

async function handleEnd(message, args, client) {
    const messageId = args[0];
    if (!messageId) {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} Please provide the timer message ID. Usage: \`.timer end <messageID>\``
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    const timer = timerStore.get(messageId);
    if (!timer) {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.cross} No timer found with that message ID.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    if (timer.status === 'ended') {
        const display = new TextDisplayBuilder().setContent(
            `${client.emoji.warn} That timer has already ended.`
        );
        return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
    }

    clearTimeout(timer.timerId);
    timer.status = 'ended';
    timerStore.set(messageId, timer);

    const endedTimeStr = formatTime(new Date());
    const endTimestamp = Math.floor(Date.now() / 1000);
    const endComponents = buildEndComponents(client, timer.title, endTimestamp, endedTimeStr);

    await timer.timerMsg.edit({
        components: [endComponents],
        flags: MessageFlags.IsComponentsV2
    }).catch(() => null);

    const display = new TextDisplayBuilder().setContent(
        `${client.emoji.check} Timer ended successfully!`
    );
    await message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
}
