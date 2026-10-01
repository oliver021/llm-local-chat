import fs from 'node:fs';
import path from 'node:path';

export interface UpstreamConfig {
  baseUrl: string;
  apiKey: string | undefined;
}

export interface ServerConfig {
  port: number;
  host: string;
  /** Directory that holds the SQLite database. */
  dataDir: string;
  /** Vite build output. The server serves it when it exists. */
  distDir: string;
  /** Allowed CORS origins. Empty = same-origin only (the default and the recommended setup). */
  corsOrigins: string[];
  /** HTTP Basic credentials. null = no authentication. */
  auth: { user: string; password: string } | null;
  llamaServerUrl: string;
  ollamaUrl: string;
  openai: UpstreamConfig;
  anthropic: UpstreamConfig;
}

export class ConfigError extends Error {}

/** Treat unset and empty ("KEY=" in a .env file) the same way. */
function read(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new ConfigError(`PORT must be an integer between 0 and 65535 (got "${raw}")`);
  }
  return port;
}

function parseUrl(env: NodeJS.ProcessEnv, name: string, fallback: string): string {
  const raw = read(env, name) ?? fallback;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError(`${name} must be a valid http(s) URL (got "${raw}")`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConfigError(`${name} must use http or https (got "${raw}")`);
  }
  // No trailing slash: the proxy joins paths onto this value.
  return raw.replace(/\/+$/, '');
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd()
): ServerConfig {
  const password = read(env, 'AUTH_PASSWORD');

  return {
    port: parsePort(read(env, 'PORT'), 3001),
    host: read(env, 'HOST') ?? '127.0.0.1',
    dataDir: path.resolve(cwd, read(env, 'DATA_DIR') ?? 'data'),
    distDir: path.resolve(cwd, read(env, 'DIST_DIR') ?? 'dist'),
    corsOrigins: (read(env, 'CORS_ORIGIN') ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    auth: password ? { user: read(env, 'AUTH_USER') ?? 'admin', password } : null,
    llamaServerUrl: parseUrl(env, 'LLAMA_SERVER_URL', 'http://localhost:8080'),
    ollamaUrl: parseUrl(env, 'OLLAMA_URL', 'http://localhost:11434'),
    openai: {
      baseUrl: parseUrl(env, 'OPENAI_BASE_URL', 'https://api.openai.com/v1'),
      apiKey: read(env, 'OPENAI_API_KEY'),
    },
    anthropic: {
      baseUrl: parseUrl(env, 'ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
      apiKey: read(env, 'ANTHROPIC_API_KEY'),
    },
  };
}

/** Heuristic: Docker creates this file in every container. */
export function isContainer(): boolean {
  return fs.existsSync('/.dockerenv');
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function isLoopback(host: string): boolean {
  return LOOPBACK_HOSTS.has(host);
}
