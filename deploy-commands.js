require('dotenv').config();
const { REST, Routes } = require('discord.js');
const config = require('./src/config');

const commands = [
  {
    name: 'botemoji',
    description: 'Bot emoji manager — shows all commands',
    default_member_permissions: '8',
    dm_permission: false,
  },
  {
    name: 'botemoji_list',
    description: 'List all application emojis',
    default_member_permissions: '8',
    dm_permission: false,
  },
  {
    name: 'botemoji_add',
    description: 'Add a bot emoji from an image or message link',
    default_member_permissions: '8',
    dm_permission: false,
    options: [
      {
        name: 'image',
        description: 'Image file (PNG/JPG/GIF/WEBP, max 256KB)',
        type: 11,
        required: false,
      },
      {
        name: 'message_link',
        description: 'Discord message link or raw :emoji_name:',
        type: 3,
        required: false,
      },
      {
        name: 'name',
        description: 'Custom name for the emoji',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'botemoji_remove',
    description: 'Remove a bot emoji by name',
    default_member_permissions: '8',
    dm_permission: false,
    options: [
      {
        name: 'name',
        description: 'Emoji name to remove',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'botemoji_rename',
    description: 'Rename a bot emoji',
    default_member_permissions: '8',
    dm_permission: false,
    options: [
      {
        name: 'old_name',
        description: 'Current emoji name',
        type: 3,
        required: true,
      },
      {
        name: 'new_name',
        description: 'New emoji name',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'Steal Emojis',
    type: 3,
    default_member_permissions: '8',
    dm_permission: false,
  },
];

const token = config.token;
const clientId = config.token ? require('discord.js').Client.user?.id : null;

async function deploy() {
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Registering application commands...');

    // Get the application ID from the token
    const appInfo = await rest.get(Routes.currentApplication());
    const applicationId = appInfo.id;

    console.log(`Application ID: ${applicationId}`);

    await rest.put(Routes.applicationCommands(applicationId), { body: commands });

    console.log(`Successfully registered ${commands.length} commands globally.`);
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
}

deploy();
