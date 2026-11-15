import type { ProxyOptions } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const officialOrigin = 'http://127.0.0.1:9749';

function officialProxy(): ProxyOptions {
  return {
    target: officialOrigin,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader('Origin', officialOrigin);
      });
    },
  };
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': officialProxy(),
      '/rpc': officialProxy(),
    },
  },
});
