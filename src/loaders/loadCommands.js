const fs = require("fs");
const path = require("path");

function registerCommand(client, command) {
  client.commands.set(command.name, command);
  if (command.aliases && Array.isArray(command.aliases)) {
    command.aliases.forEach((alias) => client.aliases.set(alias, command.name));
  } else if (command.aliases) {
    client.aliases.set(command.aliases, command.name);
  }

  if (command.slashExecute || command.slashOptions || command.type) {
    if ((command.category === "Music" || command.category === "Config" || command.category === "Favourite" || command.category === "Giveaway" || command.category === "Information") && !command.groupSlash) return;

    const slashData = {
      name: command.name,
      description: command.description || "No description provided",
      options: command.slashOptions || [],
      type: command.type || 1,
      category: command.category,
      execute: command.execute,
      slashExecute: command.slashExecute,
      autocomplete: command.autocomplete,
      run: command.run,
      player: command.player,
      inVoiceChannel: command.inVoiceChannel,
      sameVoiceChannel: command.sameVoiceChannel,
      botPerms: command.botPerms,
      userPerms: command.userPerms,
      owner: command.owner || false,
    };

    client.slashCommands.set(command.name, slashData);
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

        if (!command || !command.name) continue;

        // Support multi-command files via command.all array
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
