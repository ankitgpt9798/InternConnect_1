import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development, requests to /api are forwarded to the Express server,
    // so the browser talks to one address and login cookies work without extra setup.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
