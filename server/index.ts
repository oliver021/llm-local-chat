import path from 'node:path';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { ConfigError, isLoopback, loadConfig } from './config.js';
import { openDatabase } from './db.js';
import { loadEnvFiles } from './env.js';

const SHUTDOWN_GRACE_MS = 5000;

function main(): void {
  const envFiles = loadEnvFiles();

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`Configuration error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const dbFile = path.join(config.dataDir, 'chat.db');
  let db;
  try {
    db = openDatabase(dbFile);
  } catch (err) {
    console.error(`Could not open the database at ${dbFile}:`, err);
    process.exit(1);
  }

  const app = createApp({ config, db });

  const server: Server = app.listen(config.port, config.host, () => {
    const configured = (key?: string) => (key ? 'API key set' : 'no API key');
    console.log(`Server listening on http://${config.host}:${config.port}`);
    console.log(`  env files:  ${envFiles.join(', ') || 'none (using process environment)'}`);
    console.log(`  database:   ${dbFile}`);
    console.log(`  llama.cpp:  ${config.llamaServerUrl}`);
    console.log(`  ollama:     ${config.ollamaUrl}`);
    console.log(`  openai:     ${configured(config.openai.apiKey)} (${config.openai.baseUrl})`);
    console.log(`  anthropic:  ${configured(config.anthropic.apiKey)} (${config.anthropic.baseUrl})`);
    console.log(`  auth:       ${config.auth ? `basic auth enabled (user "${config.auth.user}")` : 'disabled'}`);

    const hasKeys = Boolean(config.openai.apiKey || config.anthropic.apiKey);
    if (!isLoopback(config.host) && !config.auth) {
      console.warn(
        '\nWARNING: the server is reachable from other machines and AUTH_PASSWORD is not set.' +
          (hasKeys ? '\n         Anyone who can reach it can spend your provider API credits.' : '') +
          '\n         Set AUTH_PASSWORD, or bind to 127.0.0.1 and put a reverse proxy in front.\n'
      );
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${config.port} is already in use. Set PORT to something else.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });

  // Graceful shutdown: stop accepting connections, give in-flight streams a
  // moment to finish, then close the database. `docker stop` sends SIGTERM.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received, shutting down…`);

    server.close(() => {
      db.close();
      process.exit(0);
    });
    server.closeIdleConnections();
    setTimeout(() => {
      server.closeAllConnections();
    }, SHUTDOWN_GRACE_MS).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
