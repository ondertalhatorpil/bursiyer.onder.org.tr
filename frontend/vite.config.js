import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Geliştirmede /api istekleri backend'e yönlendirilir (aynı origin: cookie ve CORS sorunu olmaz).
// Canlıda aynı işi Nginx yapar.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET || 'http://localhost:4000', changeOrigin: false },
    },
  },
});
