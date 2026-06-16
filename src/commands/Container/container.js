const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    ComponentType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Colors
} = require('discord.js');
const emoji = require('../../emojis');

const MAX_COMPONENTS = 20;

const COLORS = {
    none:      null,
    blurple:   Colors.Blurple,
    red:       Colors.Red,
    green:     Colors.Green,
    blue:      Colors.Blue,
    orange:    Colors.Orange,
    dark_grey: Colors.DarkGrey,
    white:     0xFFFFFF,
};

const COLOR_NAMES = {
    none:      'None',
    blurple:   'Blurple',
    red:       'Red',
    green:     'Green',
    blue:      'Blue',
    orange:    'Orange',
    dark_grey: 'Dark Grey',
    white:     'White',
};

const ADD_OPTIONS = [
    { label: 'Text Display',        value: 'text',          description: 'A block of markdown text' },
    { label: 'Separator',           value: 'separator',     description: 'A divider line or invisible spacer' },
    { label: 'Section & Thumbnail', value: 'section',       description: 'Text with a thumbnail image on the right' },
    { label: 'Media Gallery',       value: 'media_gallery', description: 'One or more images in a grid' },
    { label: 'Button Row',          value: 'button_row',    description: 'Up to 5 redirect buttons in a row' },
];

const builderStates = new Map();

function getState(authorId, reset = false) {
    if (reset || !builderStates.has(authorId)) {
        builderStates.set(authorId, {
            authorId,
            colorKey: 'none',
            data: [],
            mode: 'normal',
            reorderIndex: null,
        });
    }
    return builderStates.get(authorId);
}

function compLabel(comp, index) {
    const t = comp.type;
    if (t === 'text') {
        const p = comp.content.replace(/\n/g, ' ').slice(0, 45);
        return `${index + 1}. Text — ${p}`;
    }
    if (t === 'separator') {
        const kind = comp.divider !== false ? 'line' : 'spacer';
        return `${index + 1}. Separator (${comp.spacing || 'small'}, ${kind})`;
    }
    if (t === 'section') {
        const p = (comp.content || '').replace(/\n/g, ' ').slice(0, 40);
        return `${index + 1}. Section — ${p}`;
    }
    if (t === 'media_gallery') {
        const n = (comp.urls || []).length;
        return `${index + 1}. Gallery (${n} image${n !== 1 ? 's' : ''})`;
    }
    if (t === 'button_row') {
        const buttons = comp.buttons || [];
        const labels = buttons.slice(0, 3).map(b => b.label).join(', ');
        const suffix = buttons.length > 3 ? '...' : '';
        return `${index + 1}. Buttons — ${labels}${suffix}`;
    }
    return `${index + 1}. Unknown`;
}

function renderIntoContainer(container, comp) {
    const t = comp.type;
    if (t === 'text') {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(comp.content));
    } else if (t === 'separator') {
        const spacing = comp.spacing === 'large' ? 'Large' : 'Small';
        container.addSeparatorComponents(new SeparatorBuilder()
            .setSpacing(spacing)
            .setDivider(comp.divider !== false));
    } else if (t === 'section') {
        if (comp.content) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(comp.content));
        }
        if (comp.thumbnail_url) {
            const section = new SectionBuilder()
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(comp.thumbnail_url));
            container.addSectionComponents(section);
        }
    } else if (t === 'media_gallery') {
        if (comp.urls && comp.urls.length > 0) {
            const gallery = new MediaGalleryBuilder();
            for (const url of comp.urls) {
                gallery.addItems(new MediaGalleryItemBuilder().setURL(url));
            }
            container.addMediaGalleryComponents(gallery);
        }
    } else if (t === 'button_row') {
        if (comp.buttons && comp.buttons.length > 0) {
            const row = new ActionRowBuilder();
            for (const btn of comp.buttons.slice(0, 5)) {
                row.addComponents(new ButtonBuilder()
                    .setLabel(btn.label)
                    .setStyle(ButtonStyle.Link)
                    .setURL(btn.url));
            }
            container.addActionRowComponents(row);
        }
    }
}

function buildPreview(state) {
    const container = new ContainerBuilder();
    if (state.colorKey !== 'none') {
        container.setAccentColor(COLORS[state.colorKey]);
    }
    if (state.data.length === 0) {
        container.addTextDisplayComponents(new TextDisplayBuilder()
            .setContent(`${emoji.info} Your container is empty. Use the controls below to add components.`));
    } else {
        for (const comp of state.data) {
            renderIntoContainer(container, comp);
        }
    }
    return container;
}

function buildNormalControls(state) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`### ${emoji.settings} Container Builder`));
    container.addSeparatorComponents(new SeparatorBuilder());

    const colorName = COLOR_NAMES[state.colorKey] || 'None';
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`${emoji.arrowright} Color: **${colorName}**  |  Components: **${state.data.length} / ${MAX_COMPONENTS}**`));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

    const atMax = state.data.length >= MAX_COMPONENTS;
    const addOpts = ADD_OPTIONS.map(o => new StringSelectMenuOptionBuilder()
        .setLabel(o.label)
        .setValue(o.value)
        .setDescription(o.description));
    const addSelect = new StringSelectMenuBuilder()
        .setCustomId('cb_add')
        .setPlaceholder(atMax ? `Maximum ${MAX_COMPONENTS} components reached` : 'Add a component...')
        .addOptions(addOpts)
        .setDisabled(atMax);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(addSelect));

    const has = state.data.length > 0;
    const canReorder = state.data.length >= 2;
    const btnRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('cb_edit').setLabel('Edit').setStyle(ButtonStyle.Secondary).setDisabled(!has),
            new ButtonBuilder().setCustomId('cb_remove').setLabel('Remove').setStyle(ButtonStyle.Danger).setDisabled(!has),
            new ButtonBuilder().setCustomId('cb_color').setLabel('Color').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('cb_reorder').setLabel('Reorder').setStyle(ButtonStyle.Secondary).setDisabled(!canReorder),
            new ButtonBuilder().setCustomId('cb_send').setLabel('Send').setStyle(ButtonStyle.Primary),
        );
    container.addActionRowComponents(btnRow);

    return container;
}

function buildColorControls(state) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`### ${emoji.settings} Select Accent Color`));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`${emoji.arrowright} Choose the color bar shown on the left side of the container.`));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

    const opts = Object.entries(COLOR_NAMES).map(([key, name]) =>
        new StringSelectMenuOptionBuilder()
            .setLabel(name)
            .setValue(key)
            .setDefault(key === state.colorKey));
    const sel = new StringSelectMenuBuilder()
        .setCustomId('cb_color_sel')
        .setPlaceholder('Choose a color...')
        .addOptions(opts);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(sel));

    container.addActionRowComponents(new ActionRowBuilder()
        .addComponents(new ButtonBuilder().setCustomId('cb_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)));

    return container;
}

function buildEditControls(state) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`### ${emoji.settings} Edit a Component`));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`${emoji.arrowright} Select the component you want to edit.`));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

    const opts = state.data.map((c, i) =>
        new StringSelectMenuOptionBuilder()
            .setLabel(compLabel(c, i).slice(0, 100))
            .setValue(String(i)));
    const sel = new StringSelectMenuBuilder()
        .setCustomId('cb_edit_sel')
        .setPlaceholder('Select a component to edit...')
        .addOptions(opts);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(sel));

    container.addActionRowComponents(new ActionRowBuilder()
        .addComponents(new ButtonBuilder().setCustomId('cb_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)));

    return container;
}

function buildRemoveControls(state) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`### ${emoji.settings} Remove a Component`));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`${emoji.arrowright} Select the component you want to remove.`));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

    const opts = state.data.map((c, i) =>
        new StringSelectMenuOptionBuilder()
            .setLabel(compLabel(c, i).slice(0, 100))
            .setValue(String(i)));
    const sel = new StringSelectMenuBuilder()
        .setCustomId('cb_remove_sel')
        .setPlaceholder('Select a component to remove...')
        .addOptions(opts);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(sel));

    container.addActionRowComponents(new ActionRowBuilder()
        .addComponents(new ButtonBuilder().setCustomId('cb_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)));

    return container;
}

function buildReorderControls(state) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`### ${emoji.settings} Reorder Components`));
    container.addSeparatorComponents(new SeparatorBuilder());

    if (state.reorderIndex !== null) {
        const label = compLabel(state.data[state.reorderIndex], state.reorderIndex);
        container.addTextDisplayComponents(new TextDisplayBuilder()
            .setContent(`${emoji.arrowright} Selected: **${label.slice(0, 80)}**`));
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder()
            .setContent(`${emoji.arrowright} Select a component below, then use Move Up / Move Down.`));
    }
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

    const opts = state.data.map((c, i) =>
        new StringSelectMenuOptionBuilder()
            .setLabel(compLabel(c, i).slice(0, 100))
            .setValue(String(i))
            .setDefault(i === state.reorderIndex));
    const sel = new StringSelectMenuBuilder()
        .setCustomId('cb_reorder_sel')
        .setPlaceholder('Select a component to move...')
        .addOptions(opts);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(sel));

    const canUp = state.reorderIndex !== null && state.reorderIndex > 0;
    const canDown = state.reorderIndex !== null && state.reorderIndex < state.data.length - 1;
    const navRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('cb_move_up').setLabel('Move Up').setStyle(ButtonStyle.Secondary).setDisabled(!canUp),
            new ButtonBuilder().setCustomId('cb_move_down').setLabel('Move Down').setStyle(ButtonStyle.Secondary).setDisabled(!canDown),
            new ButtonBuilder().setCustomId('cb_reorder_done').setLabel('Done').setStyle(ButtonStyle.Primary),
        );
    container.addActionRowComponents(navRow);

    return container;
}

function buildSendControls() {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`### ${emoji.settings} Send Container`));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`${emoji.arrowright} Select the channel to send your container to.`));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

    const channelSel = new ChannelSelectMenuBuilder()
        .setCustomId('cb_channel_sel')
        .setPlaceholder('Select a channel...')
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildNews]);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(channelSel));

    container.addActionRowComponents(new ActionRowBuilder()
        .addComponents(new ButtonBuilder().setCustomId('cb_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)));

    return container;
}

function buildSentControls(channelMention) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`### ${emoji.check} Container Sent`));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder()
        .setContent(`${emoji.arrowright} Your container was sent to ${channelMention}.`));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

    container.addActionRowComponents(new ActionRowBuilder()
        .addComponents(new ButtonBuilder().setCustomId('cb_reset').setLabel('Build Another').setStyle(ButtonStyle.Secondary)));

    return container;
}

function rebuildMessage(state, sentMention) {
    const containers = [buildPreview(state)];
    if (state.mode === 'normal') {
        containers.push(buildNormalControls(state));
    } else if (state.mode === 'color') {
        containers.push(buildColorControls(state));
    } else if (state.mode === 'edit') {
        containers.push(buildEditControls(state));
    } else if (state.mode === 'remove') {
        containers.push(buildRemoveControls(state));
    } else if (state.mode === 'reorder') {
        containers.push(buildReorderControls(state));
    } else if (state.mode === 'send') {
        containers.push(buildSendControls());
    } else if (state.mode === 'sent') {
        containers.push(buildSentControls(sentMention || 'the selected channel'));
    }
    return containers;
}

function showTextModal(interaction, state, index) {
    const isEdit = index !== undefined && index !== null;
    const modal = new ModalBuilder()
        .setCustomId(isEdit ? `cb_edit_text_${interaction.user.id}` : `cb_text_${interaction.user.id}`)
        .setTitle(isEdit ? 'Edit Text Display' : 'Add Text Display')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('content')
                    .setLabel('Content')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Supports full markdown: **bold**, ### heading, > blockquote...')
                    .setRequired(true)
                    .setMaxLength(2000)
                    .setValue(isEdit ? state.data[index].content : ''),
            ),
        );
    return modal;
}

function showSeparatorModal(interaction, state, index) {
    const isEdit = index !== undefined && index !== null;
    const existing = isEdit ? state.data[index] : {};
    const modal = new ModalBuilder()
        .setCustomId(isEdit ? `cb_edit_sep_${interaction.user.id}` : `cb_sep_${interaction.user.id}`)
        .setTitle(isEdit ? 'Edit Separator' : 'Add Separator')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('divider')
                    .setLabel('Show divider line? (yes / no)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(3)
                    .setValue(existing.divider !== false ? 'yes' : 'no'),
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('spacing')
                    .setLabel('Spacing (small / large)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(5)
                    .setValue(existing.spacing || 'small'),
            ),
        );
    return modal;
}

function showSectionModal(interaction, state, index) {
    const isEdit = index !== undefined && index !== null;
    const existing = isEdit ? state.data[index] : {};
    const modal = new ModalBuilder()
        .setCustomId(isEdit ? `cb_edit_section_${interaction.user.id}` : `cb_section_${interaction.user.id}`)
        .setTitle(isEdit ? 'Edit Section' : 'Add Section & Thumbnail')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('content')
                    .setLabel('Text Content')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1000)
                    .setValue(existing.content || ''),
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('thumbnail_url')
                    .setLabel('Thumbnail URL (leave blank to skip)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder('https://example.com/image.png')
                    .setMaxLength(500)
                    .setValue(existing.thumbnail_url || ''),
            ),
        );
    return modal;
}

function showGalleryModal(interaction, state, index) {
    const isEdit = index !== undefined && index !== null;
    const existing = isEdit ? state.data[index] : {};
    const modal = new ModalBuilder()
        .setCustomId(isEdit ? `cb_edit_gallery_${interaction.user.id}` : `cb_gallery_${interaction.user.id}`)
        .setTitle(isEdit ? 'Edit Media Gallery' : 'Add Media Gallery')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('urls')
                    .setLabel('Image URLs — one per line, max 10')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setPlaceholder('https://example.com/image1.png\nhttps://example.com/image2.png')
                    .setMaxLength(4000)
                    .setValue(isEdit ? (existing.urls || []).join('\n') : ''),
            ),
        );
    return modal;
}

function showButtonRowModal(interaction, state, index) {
    const isEdit = index !== undefined && index !== null;
    const existing = isEdit ? state.data[index] : {};
    const existingText = (existing.buttons || []).map(b => `${b.label} :: ${b.url}`).join('\n');
    const modal = new ModalBuilder()
        .setCustomId(isEdit ? `cb_edit_buttons_${interaction.user.id}` : `cb_buttons_${interaction.user.id}`)
        .setTitle(isEdit ? 'Edit Button Row' : 'Add Button Row')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('buttons')
                    .setLabel('Buttons — one per line: Label :: https://url')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setPlaceholder('Discord :: https://discord.com\nGitHub :: https://github.com')
                    .setMaxLength(1000)
                    .setValue(isEdit ? existingText : ''),
            ),
        );
    return modal;
}

async function handleAddModalSubmit(modalSubmit, state, type, index) {
    if (type === 'text') {
        const content = modalSubmit.fields.getTextInputValue('content');
        const d = { type: 'text', content };
        if (index !== undefined && index !== null) {
            state.data[index] = d;
        } else {
            state.data.push(d);
        }
    } else if (type === 'separator') {
        const divider = !['no', 'n', 'false', '0'].includes(modalSubmit.fields.getTextInputValue('divider').trim().toLowerCase());
        const spacing = modalSubmit.fields.getTextInputValue('spacing').trim().toLowerCase() === 'large' ? 'large' : 'small';
        const d = { type: 'separator', divider, spacing };
        if (index !== undefined && index !== null) {
            state.data[index] = d;
        } else {
            state.data.push(d);
        }
    } else if (type === 'section') {
        const content = modalSubmit.fields.getTextInputValue('content');
        const thumbnailUrl = modalSubmit.fields.getTextInputValue('thumbnail_url').trim() || null;
        const d = { type: 'section', content, thumbnail_url: thumbnailUrl };
        if (index !== undefined && index !== null) {
            state.data[index] = d;
        } else {
            state.data.push(d);
        }
    } else if (type === 'media_gallery') {
        const urls = modalSubmit.fields.getTextInputValue('urls').split('\n').map(u => u.trim()).filter(u => u.length > 0);
        const d = { type: 'media_gallery', urls: urls.slice(0, 10) };
        if (index !== undefined && index !== null) {
            state.data[index] = d;
        } else {
            state.data.push(d);
        }
    } else if (type === 'button_row') {
        const buttons = [];
        for (const line of modalSubmit.fields.getTextInputValue('buttons').split('\n')) {
            if (!line.includes('::')) continue;
            const parts = line.split('::');
            const labelPart = parts[0];
            const urlPart = parts.slice(1).join('::');
            const label = labelPart.trim().slice(0, 80);
            const url = urlPart.trim();
            if (label && (url.startsWith('http://') || url.startsWith('https://'))) {
                buttons.push({ label, url });
            }
        }
        if (buttons.length === 0) {
            await modalSubmit.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${emoji.warn} No valid buttons found. Use the format: \`Label :: https://url.com\`**`))],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
            return false;
        }
        const d = { type: 'button_row', buttons: buttons.slice(0, 5) };
        if (index !== undefined && index !== null) {
            state.data[index] = d;
        } else {
            state.data.push(d);
        }
    }
    state.mode = 'normal';
    return true;
}

async function runContainer(context, client, isSlash) {
    const author = isSlash ? context.user : context.author;
    const state = getState(author.id, true);

    const containers = rebuildMessage(state);
    const opts = { components: containers, flags: MessageFlags.IsComponentsV2 };

    let builderMessage;
    if (isSlash) {
        if (context.deferred) {
            builderMessage = await context.editReply(opts);
        } else {
            builderMessage = await context.reply({ ...opts, fetchReply: true });
        }
    } else {
        builderMessage = await context.reply({ ...opts, fetchReply: true });
    }

    const filter = (i) => i.user.id === author.id;
    const collector = builderMessage.createMessageComponentCollector({
        filter,
        time: 600000,
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== author.id) {
            await i.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${emoji.cross} You can't use this menu.**`))],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
            return;
        }

        const customId = i.customId;

        if (customId === 'cb_add') {
            const type = i.values[0];
            let modal;
            if (type === 'text') modal = showTextModal(i, state);
            else if (type === 'separator') modal = showSeparatorModal(i, state);
            else if (type === 'section') modal = showSectionModal(i, state);
            else if (type === 'media_gallery') modal = showGalleryModal(i, state);
            else if (type === 'button_row') modal = showButtonRowModal(i, state);
            await i.showModal(modal);
            try {
                const modalSubmit = await i.awaitModalSubmit({ time: 120000 });
                const ok = await handleAddModalSubmit(modalSubmit, state, type);
                if (ok === false) return;
                await modalSubmit.deferUpdate();
                const updated = rebuildMessage(state);
                await builderMessage.edit({ components: updated, flags: MessageFlags.IsComponentsV2 });
            } catch (e) {
                if (e.code !== 'InteractionCollectorError') {
                    state.mode = 'normal';
                    try {
                        const updated = rebuildMessage(state);
                        await builderMessage.edit({ components: updated, flags: MessageFlags.IsComponentsV2 });
                    } catch (_) { }
                }
            }
            return;
        }

        if (customId === 'cb_edit') {
            state.mode = 'edit';
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_edit_sel') {
            const index = parseInt(i.values[0]);
            const comp = state.data[index];
            let modal;
            if (comp.type === 'text') modal = showTextModal(i, state, index);
            else if (comp.type === 'separator') modal = showSeparatorModal(i, state, index);
            else if (comp.type === 'section') modal = showSectionModal(i, state, index);
            else if (comp.type === 'media_gallery') modal = showGalleryModal(i, state, index);
            else if (comp.type === 'button_row') modal = showButtonRowModal(i, state, index);
            await i.showModal(modal);
            try {
                const modalSubmit = await i.awaitModalSubmit({ time: 120000 });
                const ok = await handleAddModalSubmit(modalSubmit, state, comp.type, index);
                if (ok === false) return;
                await modalSubmit.deferUpdate();
                const updated = rebuildMessage(state);
                await builderMessage.edit({ components: updated, flags: MessageFlags.IsComponentsV2 });
            } catch (e) {
                if (e.code !== 'InteractionCollectorError') {
                    state.mode = 'normal';
                    try {
                        const updated = rebuildMessage(state);
                        await builderMessage.edit({ components: updated, flags: MessageFlags.IsComponentsV2 });
                    } catch (_) { }
                }
            }
            return;
        }

        if (customId === 'cb_remove') {
            state.mode = 'remove';
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_remove_sel') {
            const index = parseInt(i.values[0]);
            state.data.splice(index, 1);
            if (state.reorderIndex !== null && state.reorderIndex >= state.data.length) {
                state.reorderIndex = state.data.length > 0 ? state.data.length - 1 : null;
            }
            state.mode = 'normal';
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_color') {
            state.mode = 'color';
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_color_sel') {
            state.colorKey = i.values[0];
            state.mode = 'normal';
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_reorder') {
            state.mode = 'reorder';
            state.reorderIndex = null;
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_reorder_sel') {
            state.reorderIndex = parseInt(i.values[0]);
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_move_up') {
            const idx = state.reorderIndex;
            if (idx !== null && idx > 0) {
                [state.data[idx], state.data[idx - 1]] = [state.data[idx - 1], state.data[idx]];
                state.reorderIndex = idx - 1;
            }
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_move_down') {
            const idx = state.reorderIndex;
            if (idx !== null && idx < state.data.length - 1) {
                [state.data[idx], state.data[idx + 1]] = [state.data[idx + 1], state.data[idx]];
                state.reorderIndex = idx + 1;
            }
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_reorder_done' || customId === 'cb_cancel') {
            state.mode = 'normal';
            state.reorderIndex = null;
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_send') {
            state.mode = 'send';
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_channel_sel') {
            const channelId = i.values[0];
            const channel = i.guild.channels.cache.get(channelId);
            if (!channel) {
                await i.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${emoji.warn} Could not find that channel.**`))],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                });
                return;
            }

            const outContainer = new ContainerBuilder();
            if (state.colorKey !== 'none') {
                outContainer.setAccentColor(COLORS[state.colorKey]);
            }
            if (state.data.length === 0) {
                outContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('*(empty container)*'));
            } else {
                for (const comp of state.data) {
                    renderIntoContainer(outContainer, comp);
                }
            }

            try {
                await channel.send({ components: [outContainer], flags: MessageFlags.IsComponentsV2 });
            } catch (err) {
                await i.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${emoji.warn} Failed to send: ${err.message}**`))],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                });
                return;
            }

            state.mode = 'sent';
            const updated = rebuildMessage(state, channel.toString());
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (customId === 'cb_reset') {
            state.colorKey = 'none';
            state.data = [];
            state.mode = 'normal';
            state.reorderIndex = null;
            const updated = rebuildMessage(state);
            await i.update({ components: updated, flags: MessageFlags.IsComponentsV2 });
            return;
        }
    });

    collector.on('end', () => {
        builderStates.delete(author.id);
        try {
            builderMessage.edit({
                components: [new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${emoji.info} Builder Expired\n${emoji.arrowright} The builder timed out after 10 minutes of inactivity.`))],
                flags: MessageFlags.IsComponentsV2,
            }).catch(() => { });
        } catch (_) { }
    });
}

module.exports = {
    name: 'container',
    category: 'Container',
    aliases: ['build', 'cb'],
    description: 'Interactively build and send Discord Components V2 containers',
    usage: 'container',

    async slashExecute(interaction, client) {
        await runContainer(interaction, client, true);
    },

    async execute(message, args, client) {
        await runContainer(message, client, false);
    },
};
