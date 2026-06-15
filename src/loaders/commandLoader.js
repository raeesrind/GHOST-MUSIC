const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  function recurse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        recurse(fullPath);
      } else if (entry.name.endsWith('.js')) {
        try {
          const cmd = require(fullPath);

          if (!cmd || !cmd.name) continue;

          if (cmd.all && Array.isArray(cmd.all)) {
            for (const sub of cmd.all) {
              if (!client.commands.has(sub.name.toLowerCase())) {
                client.commands.set(sub.name.toLowerCase(), sub);
              }
              if (Array.isArray(sub.aliases)) {
                for (const alias of sub.aliases) {
                  if (!client.commands.has(alias.toLowerCase())) {
                    client.commands.set(alias.toLowerCase(), sub);
                  }
                }
              }
            }
            continue;
          }

          if (!client.commands.has(cmd.name.toLowerCase())) {
            client.commands.set(cmd.name.toLowerCase(), cmd);
          }

          if (Array.isArray(cmd.aliases)) {
            for (const alias of cmd.aliases) {
              if (!client.commands.has(alias.toLowerCase())) {
                client.commands.set(alias.toLowerCase(), cmd);
              }
            }
          }
        } catch (err) {
          console.error(`[commandLoader] Failed to load ${fullPath}:`, err.message);
        }
      }
    }
  }

  recurse(path.join(__dirname, '../commands'));

  console.log(`[commandLoader] ${client.commands.size} commands in collection`);
};
