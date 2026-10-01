import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development Vite only serves the UI. Everything else (chat API, provider
// proxies for llama.cpp / Ollama / OpenAI / Anthropic) lives in the Express
// server — run it with `npm run dev:server` or `npm run dev:all`.
const API_TARGET = `http://localhost:${process.env.PORT ?? 3001}`;

export default defineConfig({
  server: {
    proxy: {
      '/api': API_TARGET,
      '/v1': API_TARGET,
      '/ollama': API_TARGET,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
