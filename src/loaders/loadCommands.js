const fs = require("fs");
const path = require("path");

// Load grouped command names so individual commands covered by groups are skipped from slash registration
const GROUPS_DIR = path.join(__dirname, "../commands/groups");
const GROUPED_JSON_PATH = path.join(GROUPS_DIR, "grouped-commands.json");
let groupedNames = new Set();
try {
  if (fs.existsSync(GROUPED_JSON_PATH)) {
    const arr = JSON.parse(fs.readFileSync(GROUPED_JSON_PATH, "utf8"));
    groupedNames = new Set(arr);
  }
} catch {}

function registerCommand(client, command) {
  client.commands.set(command.name, command);
  if (command.aliases && Array.isArray(command.aliases)) {
    command.aliases.forEach((alias) => client.aliases.set(alias, command.name));
  } else if (command.aliases) {
    client.aliases.set(command.aliases, command.name);
  }

  if (command.slashExecute || command.slashOptions || command.type || command.data) {
    // Skip commands that are now covered by group files
    if (command.name && groupedNames.has(command.name)) return;

    if ((command.category === "Music" || command.category === "Config" || command.category === "Favourite" || command.category === "Giveaway" || command.category === "Information") && !command.groupSlash) return;

    const name = command.data ? command.data.name : command.name;
    const description = command.data ? command.data.description : (command.description || "No description provided");
    const options = command.data ? command.data.toJSON().options : (command.slashOptions || []);

    const slashData = {
      name,
      description,
      options,
      type: command.type || 1,
      category: command.category,
      execute: command.data ? command.execute : command.execute,
      slashExecute: command.data ? command.execute : command.slashExecute,
      autocomplete: command.autocomplete,
      run: command.run,
      player: command.player,
      inVoiceChannel: command.inVoiceChannel,
      sameVoiceChannel: command.sameVoiceChannel,
      botPerms: command.botPerms,
      userPerms: command.userPerms,
      owner: command.owner || false,
    };

    client.slashCommands.set(name, slashData);
  }
}

module.exports = (client) => {
  const commandsPath = path.join(__dirname, "../commands");
  let totalCommands = 0;

  function recurse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        recurse(fullPath);
      } else if (entry.name.endsWith(".js")) {
        const command = require(fullPath);

        if (!command || !command.data && !command.name) continue;

        if (command.all && Array.isArray(command.all)) {
          for (const sub of command.all) {
            registerCommand(client, sub);
            totalCommands++;
          }
          continue;
        }

        registerCommand(client, command);
        totalCommands++;
      }
    }
  }

  recurse(commandsPath);

  client.logger.log(`Prefix Commands Loaded: ${totalCommands}`, "cmd");
  client.logger.log(`Slash Commands Loaded: ${client.slashCommands.size}`, "cmd");
};
