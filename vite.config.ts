import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development Vite only serves the UI. Everything else (chat API, provider
// proxies for llama.cpp / Ollama / OpenAI / Anthropic) lives in the Express
// server: run it with `npm run dev:server`, or both with `npm run dev:all`.
export default defineConfig(({ mode }) => {
  // Same PORT the server reads from .env, so the proxy always finds it.
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = `http://localhost:${env.PORT || 3001}`;

  return {
    server: {
      proxy: {
        '/api': apiTarget,
        '/v1': apiTarget,
        '/ollama': apiTarget,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
  };
});
