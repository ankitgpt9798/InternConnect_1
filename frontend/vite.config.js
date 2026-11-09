import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development, requests to /api are forwarded to the Express server,
    // so the browser talks to one address and login cookies work without extra setup.
    // xfwd adds X-Forwarded-For, so the API records the browser's IP address (Module 6) instead of this proxy's.
    proxy: {
      '/api': { target: 'http://localhost:5000', xfwd: true },
    },
  },
});
