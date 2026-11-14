import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Official UI only answers the browser on 127.0.0.1:9749. This dev server
// proxies the same paths so the page can stay on 5173.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:9749', changeOrigin: true },
      '/rpc': { target: 'http://127.0.0.1:9749', changeOrigin: true },
    },
  },
});
