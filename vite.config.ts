import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for Node.js modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@walletconnect/ethereum-provider'],
  },
  define: {
    'process.env': {},
  },
  base: '/',
  server: {
    host: '0.0.0.0', // allow access from network
    port: 5173,
    strictPort: false,
    // proxy basename API to avoid CORS (api.basename.app blocks browser requests)
    proxy: {
      '/api/basename': {
        target: 'https://api.basename.app',
        changeOrigin: true,
        rewrite: (path) => '/v1/names' + path.replace(/^\/api\/basename/, ''),
      },
    },
  },
});
