import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  // Lets phones / other PCs on your Wi‑Fi open the dev server via http://<your-LAN-ip>:5173
  // (Terminal prints “Network” URL after `npm run dev`.)
  server: {
    host: true,
    port: 5173,
  },
})
