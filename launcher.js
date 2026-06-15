const { fork, spawn } = require('child_process');
const http = require('http');

const cwd = __dirname;
const subProcesses = {};
const waitingQueue = [];
const guildVcAssignment = new Map();
const LAUNCHER_PORT = 48901;

console.log('╔══════════════════════════════════════╗');
console.log('║     GHOST-MUSIC SUB-BOT LAUNCHER      ║');
console.log('╚══════════════════════════════════════╝');

function startMainBot() {
  const proc = spawn('node', ['--no-warnings', 'Shard.js'], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, BOT_TYPE: 'main' },
  });
  proc.on('error', (err) => console.error('[Launcher] Main bot error:', err.message));
  proc.on('exit', (code, signal) => {
    console.log(`[Launcher] Main bot exited (code: ${code}, signal: ${signal})`);
  });
  console.log(`[Launcher] Started Main Bot (PID: ${proc.pid})`);
  return proc;
}

function startSubBot(index) {
  const proc = fork('./subBot.js', [], {
    cwd,
    env: { ...process.env, GHOST_BOT_ID: String(index) },
    stdio: 'inherit',
  });

  subProcesses[index] = proc;

  proc.on('error', (err) => console.error(`[Launcher] Ghost-${index} error:`, err.message));
  proc.on('exit', (code, signal) => {
    console.log(`[Launcher] Ghost-${index} exited (code: ${code}, signal: ${signal})`);
    delete subProcesses[index];
  });

  proc.on('message', (msg) => {
    if (msg.type === 'BOT_FREE') {
      if (msg.guildId) {
        for (const [key, botIdx] of guildVcAssignment) {
          if (key.startsWith(`${msg.guildId}:`) && botIdx === index) {
            guildVcAssignment.delete(key);
          }
        }
      }
      const next = waitingQueue.shift();
      if (next && subProcesses[index]) {
        const { guildId, channelId } = next;
        const vcKey = `${guildId}:${channelId || ''}`;
        const alreadyAssigned = guildVcAssignment.get(vcKey);
        if (alreadyAssigned !== undefined && alreadyAssigned !== index) {
          waitingQueue.unshift(next);
          return;
        }
        guildVcAssignment.set(vcKey, index);
        subProcesses[index].send({ type: 'HANDLE_COMMAND', ...next });
      }
    }
  });

  console.log(`[Launcher] Started Ghost-${index} (PID: ${proc.pid})`);
  return proc;
}

function findFreeSubBot(guildId) {
  return new Promise((resolve) => {
    const indices = Object.keys(subProcesses);
    if (indices.length === 0) return resolve(null);

    let replied = 0;
    const results = {};
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      resolve(null);
    }, 2000);

    for (const idx of indices) {
      const proc = subProcesses[idx];
      if (!proc) {
        replied++;
        if (replied === indices.length && !timedOut) {
          clearTimeout(timer);
          const free = Object.entries(results).find(([, busy]) => !busy);
          resolve(free ? parseInt(free[0]) : null);
        }
        continue;
      }

      const requestId = `${idx}_${Date.now()}_${Math.random()}`;
      const handler = (msg) => {
        if (msg.type === 'STATUS_REPLY' && msg.requestId === requestId) {
          proc.off('message', handler);
          results[idx] = msg.busy;
          replied++;
          if (replied === indices.length && !timedOut) {
            clearTimeout(timer);
            const free = Object.entries(results).find(([, busy]) => !busy);
            resolve(free ? parseInt(free[0]) : null);
          }
        }
      };
      proc.on('message', handler);
      proc.send({ type: 'STATUS_REQUEST', guildId, requestId });
    }
  });
}

const httpServer = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    return res.end();
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);

      if (req.url === '/route') {
        const { guildId, channelId } = data;
        const vcKey = `${guildId}:${channelId || ''}`;
        const assignedBot = guildVcAssignment.get(vcKey);

        if (assignedBot !== undefined && subProcesses[assignedBot]) {
          subProcesses[assignedBot].send({ type: 'HANDLE_COMMAND', ...data });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, botIndex: assignedBot }));
        }

        const freeIdx = await findFreeSubBot(guildId);
        if (freeIdx === null || !subProcesses[freeIdx]) {
          const qlen = waitingQueue.push(data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, queued: true, position: qlen }));
        }
        guildVcAssignment.set(vcKey, freeIdx);
        subProcesses[freeIdx].send({ type: 'HANDLE_COMMAND', ...data });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, botIndex: freeIdx }));
      }

      if (req.url === '/findfree') {
        const { guildId } = data;
        const freeIdx = await findFreeSubBot(guildId);
        if (freeIdx === null) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ free: false, position: waitingQueue.length + 1 }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ free: true, botIndex: freeIdx }));
      }

      res.writeHead(404);
      res.end();
    } catch (err) {
      res.writeHead(400);
      res.end();
    }
  });
});

httpServer.listen(LAUNCHER_PORT, () => {
  console.log(`[Launcher] IPC proxy listening on port ${LAUNCHER_PORT}`);
});

// Start sub-bots first, then main bot with delay to avoid rate-limit bursts
for (let i = 1; i <= 3; i++) startSubBot(i);
setTimeout(() => startMainBot(), 5000);

console.log('[Launcher] All processes launched.');
console.log('[Launcher] Press Ctrl+C to stop all bots.');
