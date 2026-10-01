import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../server/app.js';
import { loadConfig, type ServerConfig } from '../../server/config.js';
import { openDatabase, type Db } from '../../server/db.js';

export interface RunningServer {
  /** http://127.0.0.1:<port> */
  url: string;
  close: () => Promise<void>;
}

export async function listen(handler: http.RequestListener): Promise<RunningServer> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export interface TestApp extends RunningServer {
  db: Db;
  config: ServerConfig;
}

/** The real app on an ephemeral port with an in-memory database. */
export async function startApp(env: Record<string, string> = {}): Promise<TestApp> {
  const config = loadConfig({ DIST_DIR: '/nonexistent-dist', ...env }, process.cwd());
  const db = openDatabase(':memory:');
  const server = await listen(createApp({ config, db }));
  return {
    ...server,
    db,
    config,
    close: async () => {
      await server.close();
      db.close();
    },
  };
}

export interface RecordedRequest {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/**
 * A fake upstream service (llama.cpp, OpenAI, ...). Records what it receives and
 * answers with whatever `respond` does.
 */
export async function startUpstream(
  respond: (req: http.IncomingMessage, res: http.ServerResponse, body: string) => void
): Promise<RunningServer & { requests: RecordedRequest[] }> {
  const requests: RecordedRequest[] = [];
  const server = await listen((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      requests.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body });
      respond(req, res, body);
    });
  });
  return { ...server, requests };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll until `check` returns true or the timeout passes. */
export async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await sleep(10);
  }
}

/** `Response.json()` is typed `unknown` without the DOM lib; tests want to poke at fields. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readJson = (res: Response): Promise<any> => res.json();

export const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
