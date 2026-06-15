const LAUNCHER_PORT = 48901;

function startMainBotServer(client) {
  client.launcherPort = LAUNCHER_PORT;
  console.log(`[Bridge] Launcher IPC proxy configured on port ${LAUNCHER_PORT}`);
}

module.exports = startMainBotServer;
