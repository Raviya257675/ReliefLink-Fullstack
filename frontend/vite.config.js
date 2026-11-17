import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Development: proxy the API (including SSE streams) to the Node backend on port 5000.
const backend = process.env.VITE_BACKEND || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/api/events': backend,
    },
  },
});
