#!/usr/bin/env node
/**
 * Classic Expo start — Metro logs + QR in the terminal.
 * Sets the LAN hostname from the active Wi‑Fi IPv4 so Expo Go
 * opens exp://<current-ip>:8081 (not a stale IP from another network).
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const projectRoot = path.join(__dirname, '..');
const repoRoot = path.join(projectRoot, '..', '..');
const expoCli = [
  path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli'),
  path.join(repoRoot, 'node_modules', 'expo', 'bin', 'cli'),
].find((p) => fs.existsSync(p));
const universe = path.join(projectRoot, 'expo-offline-universe');

if (!expoCli) {
  console.error('Expo CLI not found. From repo root run: npm install');
  process.exit(1);
}

function isPrivateIPv4(ip) {
  return (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

/** Prefer the Wi‑Fi DHCP address; never pick APIPA 169.254.* */
function detectLanIPv4() {
  try {
    const nets = os.networkInterfaces();
    const wifi = [];
    const other = [];
    for (const [name, entries] of Object.entries(nets)) {
      if (!entries) continue;
      for (const net of entries) {
        if (net.family !== 'IPv4' && net.family !== 4) continue;
        if (net.internal) continue;
        if (!isPrivateIPv4(net.address)) continue;
        const row = { name, address: net.address };
        if (/wi-?fi|wlan|wireless/i.test(name)) wifi.push(row);
        else other.push(row);
      }
    }
    if (wifi[0]) return wifi[0].address;
    if (other[0]) return other[0].address;
  } catch {
    /* ignore */
  }
  return null;
}

function freeListenPort(port) {
  try {
    if (process.platform !== 'win32') return;
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes(`:${port}`) || !line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

const rawArgs = process.argv.slice(2).filter((a, i, all) => {
  // `npm start mobile` is a common mix-up; Expo treats extra paths as project root.
  if (a === 'mobile' || a === 'web' || a === 'admin') {
    const prev = all[i - 1];
    if (prev === 'start' || prev === '--' || !prev) return false;
  }
  return true;
});
const env = { ...process.env };
const lan = detectLanIPv4();
const wantsTunnel = rawArgs.includes('--tunnel');
const isStart = rawArgs[0] === 'start' || rawArgs.includes('start');

if (wantsTunnel || env.EXPO_ONLINE === '1' || env.EXPO_ONLINE === 'true') {
  delete env.EXPO_OFFLINE;
  env.EXPO_ONLINE = '1';
} else {
  // School/corporate TLS: skip Expo version fetch. App/Supabase still online.
  env.EXPO_OFFLINE = '1';
}

if (!env.EXPO_UNIVERSE_DIR && fs.existsSync(universe)) {
  env.EXPO_UNIVERSE_DIR = universe;
}

if (lan && !wantsTunnel) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = lan;
}

const args = [...rawArgs];

if (isStart && !wantsTunnel) {
  // One clean Metro on 8081 — avoids stale QR pointing at 8082 / old IP.
  freeListenPort(8081);
  freeListenPort(8082);
  if (!args.includes('--port')) args.push('--port', '8081');
  if (!args.includes('--lan') && !args.includes('--localhost') && !args.includes('--tunnel')) {
    args.push('--lan');
  }
  if (lan) {
    console.log(`[expo] Wi‑Fi packager host: exp://${lan}:8081`);
    console.log('[expo] Phone must be on the same Wi‑Fi. Scan the QR Metro prints below.');
  }
}

const child = spawn(process.execPath, ['--use-system-ca', expoCli, ...args], {
  stdio: 'inherit',
  env,
  shell: false,
  cwd: projectRoot,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});
