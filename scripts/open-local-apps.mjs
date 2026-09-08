/**
 * Opens tourist web and standalone admin on different ports so auth sessions stay separate.
 * Start servers first: `npm run web` + `npm run admin`, or `npm run dev:both`.
 */
import { exec } from 'node:child_process';
import process from 'node:process';

const LINKS = [
  { label: 'User (web)', url: 'http://localhost:5173/' },
  { label: 'Admin', url: 'http://localhost:3001/' },
];

function openUrl(url) {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}

console.log('Local apps (separate sessions):');
for (const link of LINKS) {
  console.log(`  ${link.label}: ${link.url}`);
  openUrl(link.url);
}
