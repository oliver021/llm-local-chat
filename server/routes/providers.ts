import { Router } from 'express';
import type { ServerConfig } from '../config.js';

export interface ProvidersStatus {
  openai: { configured: boolean };
  anthropic: { configured: boolean };
}

/**
 * Tells the UI which cloud providers have an API key on the server.
 * Only booleans: the keys themselves never leave the server.
 */
export function createProvidersRouter(config: ServerConfig): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    const status: ProvidersStatus = {
      openai: { configured: Boolean(config.openai.apiKey) },
      anthropic: { configured: Boolean(config.anthropic.apiKey) },
    };
    res.json(status);
  });
  return router;
}
