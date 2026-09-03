import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@admin': path.resolve(__dirname, '../admin/src'),
      'cavitour-shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    // Keep 5173 so mobile Google OAuth bridge URLs (and Supabase Redirect URLs) stay valid.
    strictPort: true,
    watch: {
      // OneDrive locks newly written binaries; watching them throws EBUSY and kills Vite.
      ignored: ['**/public/landing/**'],
    },
    fs: {
      allow: [path.resolve(__dirname, '..'), path.resolve(__dirname, '../..')],
    },
  },
});
