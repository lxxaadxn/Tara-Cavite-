import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3001,
    strictPort: true,
    fs: {
      // 'C:/tara-cavite' is an optional NTFS junction to this repo (no comma/space
      // in the path) — same workaround as apps/web. Ignored if it doesn't exist.
      allow: [
        path.resolve(__dirname, '..'),
        path.resolve(__dirname, '../..'),
        ...(fs.existsSync('C:/tara-cavite') ? ['C:/tara-cavite'] : []),
      ],
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'cavitour-shared': path.resolve(__dirname, '../shared'),
    },
  },
});
