import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(() => {
    return {
      server: {
        proxy: {
          '/api': {
            target: 'http://localhost:3001',   // local API server (SQLite)
            changeOrigin: true,
          },
          '/v1': {
            target: 'http://localhost:8080',   // llama-server
            changeOrigin: true,
          },
          '/ollama': {
            target: 'http://localhost:11434',  // Ollama local server
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/ollama/, ''),
          },
        },
      },
      plugins: react(),
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
