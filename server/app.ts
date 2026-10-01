import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import { basicAuth } from './auth.js';
import type { ServerConfig } from './config.js';
import type { Db } from './db.js';
import { errorHandler } from './http.js';
import { createProxy } from './proxy.js';
import { createBookmarksRouter } from './routes/bookmarks.js';
import { createChatsRouter } from './routes/chats.js';
import { createProvidersRouter } from './routes/providers.js';

const JSON_BODY_LIMIT = '5mb';

/**
 * Content-Security-Policy for the bundled UI. Everything is same-origin except
 * the Hugging Face model browser (API + avatars). Inline styles are needed by
 * React style props and the toast library.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://huggingface.co https://cdn-avatars.huggingface.co",
  "font-src 'self' data:",
  "connect-src 'self' https://huggingface.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders: RequestHandler = (_req, res, next) => {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
};

/** Paths that belong to the API or a proxy and must never fall back to index.html. */
const NON_SPA_PREFIXES = ['/api', '/v1', '/ollama'];

export interface AppDeps {
  config: ServerConfig;
  db: Db;
}

export function createApp({ config, db }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);

  if (config.corsOrigins.length > 0) {
    app.use(cors({ origin: config.corsOrigins }));
  }

  // Unauthenticated on purpose: container health checks and uptime probes.
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  if (config.auth) {
    const { user, password } = config.auth;
    app.use(basicAuth({ user, password }));
  }

  // ── Provider proxies ──────────────────────────────────────────────────────
  // Mounted before any body parser: request bodies are streamed through untouched.
  // API keys live only here, never in the browser bundle.

  app.use(
    '/v1',
    createProxy({
      name: 'llama.cpp',
      target: config.llamaServerUrl,
      pathPrefix: '/v1',
      allow: [
        { method: 'GET', path: /^\/v1\/models$/ },
        { method: 'POST', path: /^\/v1\/chat\/completions$/ },
      ],
    })
  );

  app.use(
    '/ollama',
    createProxy({
      name: 'Ollama',
      target: config.ollamaUrl,
      allow: [
        { method: 'GET', path: /^\/api\/(tags|version)$/ },
        { method: 'POST', path: /^\/api\/(show|chat|generate)$/ },
        { method: 'GET', path: /^\/v1\/models$/ },
        { method: 'POST', path: /^\/v1\/chat\/completions$/ },
      ],
    })
  );

  app.use(
    '/api/proxy/openai',
    createProxy({
      name: 'OpenAI',
      target: config.openai.baseUrl,
      allow: [
        { method: 'GET', path: /^\/models$/ },
        { method: 'POST', path: /^\/chat\/completions$/ },
      ],
      upstreamHeaders: () =>
        config.openai.apiKey ? { authorization: `Bearer ${config.openai.apiKey}` } : null,
      notConfiguredMessage: 'OPENAI_API_KEY is not set on the server',
    })
  );

  app.use(
    '/api/proxy/anthropic',
    createProxy({
      name: 'Anthropic',
      target: config.anthropic.baseUrl,
      allow: [
        { method: 'GET', path: /^\/v1\/models$/ },
        { method: 'POST', path: /^\/v1\/messages$/ },
      ],
      defaultHeaders: { 'anthropic-version': '2023-06-01' },
      upstreamHeaders: () =>
        config.anthropic.apiKey ? { 'x-api-key': config.anthropic.apiKey } : null,
      notConfiguredMessage: 'ANTHROPIC_API_KEY is not set on the server',
    })
  );

  // ── Application API ───────────────────────────────────────────────────────

  app.use('/api/providers', createProvidersRouter(config));
  app.use('/api/chats', express.json({ limit: JSON_BODY_LIMIT }), createChatsRouter(db));
  app.use('/api/bookmarks', express.json({ limit: JSON_BODY_LIMIT }), createBookmarksRouter(db));

  // ── Frontend ──────────────────────────────────────────────────────────────

  const indexHtml = path.join(config.distDir, 'index.html');
  const hasFrontend = fs.existsSync(indexHtml);

  if (hasFrontend) {
    app.use(
      express.static(config.distDir, {
        index: false,
        setHeaders(res, filePath) {
          // Vite fingerprints everything under /assets, so it can be cached forever.
          const immutable = filePath.split(path.sep).includes('assets');
          res.setHeader(
            'Cache-Control',
            immutable ? 'public, max-age=31536000, immutable' : 'no-cache'
          );
        },
      })
    );
  }

  // Client-side routes fall back to index.html; unknown API paths get a JSON 404.
  app.use((req, res) => {
    const isApiPath = NON_SPA_PREFIXES.some(
      (prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`)
    );
    // A missing /assets/app-1a2b3c.js must be a 404, not index.html with a 200:
    // browsers would try to run the HTML as a script and show a baffling syntax error.
    const looksLikeFile = path.extname(req.path) !== '';
    const wantsPage = (req.method === 'GET' || req.method === 'HEAD') && !isApiPath && !looksLikeFile;

    if (wantsPage && hasFrontend) {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
      return;
    }
    if (wantsPage) {
      res
        .status(404)
        .type('text/plain')
        .send(
          'The frontend has not been built.\n' +
            'Run `npm run build`, or open the Vite dev server (npm run dev) at http://localhost:5173.\n'
        );
      return;
    }
    res.status(404).json({ error: 'not_found', message: 'Route not found' });
  });

  app.use(errorHandler);
  return app;
}
