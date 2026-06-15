require('dotenv').config();
require('events').EventEmitter.defaultMaxListeners = 100;
const config = require("./src/config");
const { ClusterManager } = require("discord-hybrid-sharding");

async function spawnWithRetry(manager, retries = 5, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await manager.spawn({ timeout: -1 });
      return;
    } catch (err) {
      const isRateLimit = err.message?.includes('429') || err.statusCode === 429;
      console.log(`[ShardManager] Spawn attempt ${attempt}/${retries} failed${isRateLimit ? ' (rate limited)' : ''}: ${err.message?.slice(0, 80)}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
}

const manager = new ClusterManager("./index.js", {
  totalShards: "auto",
  shardsPerCluster: 1,
  mode: "process",
  token: config.token,
  respawn: true,
  restarts: {
    max: 5,
    interval: 1000,
  },
  execArgv: ["--no-warnings"],
});

manager.on("clusterCreate", (cluster) => {
  console.log(`[ShardManager] Launched cluster ${cluster.id}`);
});

spawnWithRetry(manager).catch(err => {
  console.error('[ShardManager] Failed to spawn after all retries:', err.message);
  process.exit(1);
});
