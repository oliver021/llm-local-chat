import type http from 'node:http';
import { createConnection } from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { createProxy, type ProxyOptions } from '../../server/proxy.js';
import { listen, readJson, startApp, startUpstream, waitFor, type RunningServer } from './helpers.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((fn) => fn()));
});
const track = <T extends RunningServer>(server: T): T => {
  cleanup.push(server.close);
  return server;
};

const ok = (body: unknown) => (_req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
};

/** A proxy mounted under /p on its own tiny app, for fine-grained option control. */
async function proxyApp(options: Partial<ProxyOptions> & Pick<ProxyOptions, 'target'>) {
  const app = express();
  app.use(
    '/p',
    createProxy({
      name: 'test',
      allow: [
        { method: 'GET', path: /^\/models$/ },
        { method: 'POST', path: /^\/chat$/ },
      ],
      ...options,
    })
  );
  return track(await listen(app));
}

describe('proxy: forwarding', () => {
  it('forwards method, path, query and JSON body', async () => {
    const upstream = track(await startUpstream(ok({ done: true })));
    const proxy = await proxyApp({ target: upstream.url });

    const res = await fetch(`${proxy.url}/p/chat?x=1&y=two`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'm', messages: [{ role: 'user', content: 'hi' }] }),
    });

    expect(res.status).toBe(200);
    expect(await readJson(res)).toEqual({ done: true });
    expect(upstream.requests).toHaveLength(1);
    expect(upstream.requests[0]).toMatchObject({ method: 'POST', url: '/chat?x=1&y=two' });
    expect(upstream.requests[0].headers['content-type']).toBe('application/json');
    expect(JSON.parse(upstream.requests[0].body).model).toBe('m');
  });

  it('keeps the path of the target URL and applies pathPrefix', async () => {
    const upstream = track(await startUpstream(ok({})));
    const proxy = await proxyApp({
      target: `${upstream.url}/v1`,
      pathPrefix: '/api',
      allow: [{ method: 'GET', path: /^\/api\/models$/ }],
    });
    await fetch(`${proxy.url}/p/models`);
    expect(upstream.requests[0].url).toBe('/v1/api/models');
  });

  it('relays upstream errors with their status and retry-after', async () => {
    const upstream = track(
      await startUpstream((_req, res) => {
        res
          .writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '7' })
          .end(JSON.stringify({ error: { message: 'slow down' } }));
      })
    );
    const proxy = await proxyApp({ target: upstream.url });
    const res = await fetch(`${proxy.url}/p/models`);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('7');
    expect((await readJson(res)).error.message).toBe('slow down');
  });

  it('drops browser credentials and cookies, and sends only what it injects', async () => {
    const upstream = track(await startUpstream(ok({})));
    const proxy = await proxyApp({
      target: upstream.url,
      upstreamHeaders: () => ({ authorization: 'Bearer server-secret' }),
    });
    await fetch(`${proxy.url}/p/models`, {
      headers: {
        Authorization: 'Bearer browser-supplied',
        'x-api-key': 'browser-key',
        Cookie: 'session=abc',
        Origin: 'http://evil.example',
      },
    });
    const headers = upstream.requests[0].headers;
    expect(headers.authorization).toBe('Bearer server-secret');
    expect(headers['x-api-key']).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    expect(headers.origin).toBeUndefined();
  });

  it('lets the browser override defaultHeaders but never injected ones', async () => {
    const upstream = track(await startUpstream(ok({})));
    const proxy = await proxyApp({
      target: upstream.url,
      defaultHeaders: { 'anthropic-version': '2023-06-01' },
      upstreamHeaders: () => ({ 'x-api-key': 'real' }),
    });

    await fetch(`${proxy.url}/p/models`);
    await fetch(`${proxy.url}/p/models`, {
      headers: { 'anthropic-version': '2099-01-01', 'x-api-key': 'fake' },
    });

    expect(upstream.requests[0].headers['anthropic-version']).toBe('2023-06-01');
    expect(upstream.requests[1].headers['anthropic-version']).toBe('2099-01-01');
    expect(upstream.requests.map((r) => r.headers['x-api-key'])).toEqual(['real', 'real']);
  });

  it('never follows redirects and does not leak the Location header', async () => {
    const elsewhere = track(await startUpstream(ok({ leaked: true })));
    const upstream = track(
      await startUpstream((_req, res) => {
        res.writeHead(302, { Location: elsewhere.url }).end();
      })
    );
    const proxy = await proxyApp({
      target: upstream.url,
      upstreamHeaders: () => ({ 'x-api-key': 'secret' }),
    });

    const res = await fetch(`${proxy.url}/p/models`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBeNull();
    expect(elsewhere.requests).toHaveLength(0);
  });
});

describe('proxy: allow-list', () => {
  it('404s methods and paths that are not allow-listed without contacting upstream', async () => {
    const upstream = track(await startUpstream(ok({})));
    const proxy = await proxyApp({ target: upstream.url });

    expect((await fetch(`${proxy.url}/p/models`, { method: 'DELETE' })).status).toBe(404);
    expect((await fetch(`${proxy.url}/p/files`)).status).toBe(404);
    expect((await fetch(`${proxy.url}/p/chat`)).status).toBe(404); // GET on a POST-only path
    expect((await fetch(`${proxy.url}/p/models/extra`)).status).toBe(404);
    expect(upstream.requests).toHaveLength(0);
  });

  it('cannot be bypassed with dot segments, encoded or not', async () => {
    const upstream = track(await startUpstream(ok({})));
    const proxy = await proxyApp({
      target: upstream.url,
      allow: [{ method: 'GET', path: /^\/models$/ }],
    });

    // fetch() would normalise these, so send the raw request line.
    const raw = (path: string) =>
      new Promise<string>((resolve, reject) => {
        const socket = createConnection(Number(new URL(proxy.url).port), '127.0.0.1', () => {
          socket.write(`GET ${path} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`);
        });
        let data = '';
        socket.on('data', (chunk) => (data += chunk));
        socket.on('end', () => resolve(data.split('\r\n')[0]));
        socket.on('error', reject);
      });

    for (const path of [
      '/p/models/../admin',
      '/p/%2e%2e/admin',
      '/p/models/%2e%2e/%2e%2e/etc/passwd',
      '/p//evil.example/models',
    ]) {
      expect(await raw(path), path).toContain('404');
    }
    expect(upstream.requests).toHaveLength(0);
  });

  it('keeps a request to another host out of the picture', async () => {
    const upstream = track(await startUpstream(ok({})));
    const proxy = await proxyApp({
      target: upstream.url,
      allow: [{ method: 'GET', path: /.*/ }], // deliberately permissive
    });
    // "@evil.example/" must stay part of the path, not turn into credentials/host.
    const res = await fetch(`${proxy.url}/p/@evil.example/models`);
    expect(res.status).toBe(200);
    expect(upstream.requests[0].url).toBe('/@evil.example/models');
  });
});

describe('proxy: failures', () => {
  it('503s with a clear message when credentials are not configured', async () => {
    const upstream = track(await startUpstream(ok({})));
    const proxy = await proxyApp({
      target: upstream.url,
      upstreamHeaders: () => null,
      notConfiguredMessage: 'KEY is not set on the server',
    });
    const res = await fetch(`${proxy.url}/p/models`);
    expect(res.status).toBe(503);
    expect((await readJson(res)).error).toMatchObject({
      type: 'not_configured',
      message: 'KEY is not set on the server',
    });
    expect(upstream.requests).toHaveLength(0);
  });

  it('502s when the upstream is down, naming what could not be reached', async () => {
    const dead = await startUpstream(ok({}));
    const target = dead.url;
    await dead.close();
    const proxy = await proxyApp({ target, name: 'llama.cpp' });
    const res = await fetch(`${proxy.url}/p/models`);
    expect(res.status).toBe(502);
    const { error } = await readJson(res);
    expect(error.type).toBe('upstream_unreachable');
    expect(error.message).toContain('llama.cpp');
    expect(error.message).toContain(target);
  });

  it('504s when the upstream never answers', async () => {
    const upstream = track(await startUpstream(() => {})); // never responds
    const proxy = await proxyApp({ target: upstream.url, headersTimeoutMs: 100 });
    const res = await fetch(`${proxy.url}/p/models`);
    expect(res.status).toBe(504);
    expect((await readJson(res)).error.type).toBe('upstream_timeout');
  });

  it('413s oversized request bodies', async () => {
    const upstream = track(await startUpstream(ok({})));
    const proxy = await proxyApp({ target: upstream.url, maxBodyBytes: 1024 });
    const res = await fetch(`${proxy.url}/p/chat`, { method: 'POST', body: 'x'.repeat(2048) });
    expect(res.status).toBe(413);
    expect(upstream.requests).toHaveLength(0);
  });
});

describe('proxy: streaming', () => {
  it('delivers server-sent events as they arrive, not when the response ends', async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => (finish = resolve));
    const upstream = track(
      await startUpstream((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n');
        gate.then(() => {
          res.write('data: {"choices":[{"delta":{"content":"lo"}}]}\n\n');
          res.end('data: [DONE]\n\n');
        });
      })
    );
    const proxy = await proxyApp({ target: upstream.url });

    const res = await fetch(`${proxy.url}/p/chat`, { method: 'POST', body: '{}' });
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    expect(res.headers.get('cache-control')).toBe('no-store');

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const first = decoder.decode((await reader.read()).value);
    expect(first).toContain('"Hel"'); // arrived while upstream is still open

    finish();
    let rest = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    expect(rest).toContain('"lo"');
    expect(rest).toContain('[DONE]');
  });

  it('cancels the upstream request when the browser disconnects (stop button)', async () => {
    let upstreamClosed = false;
    const upstream = track(
      await startUpstream((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write('data: first\n\n');
        res.on('close', () => (upstreamClosed = true));
        // never ends on its own
      })
    );
    const proxy = await proxyApp({ target: upstream.url });

    const controller = new AbortController();
    const res = await fetch(`${proxy.url}/p/chat`, {
      method: 'POST',
      body: '{}',
      signal: controller.signal,
    });
    await res.body!.getReader().read(); // got the first chunk
    expect(upstreamClosed).toBe(false);

    controller.abort();
    await waitFor(() => upstreamClosed);
    expect(upstreamClosed).toBe(true);
  });
});

describe('proxy: wiring in the real app', () => {
  it('OpenAI: adds the server-side key, rewrites the base path, hides the key from the browser', async () => {
    const upstream = track(await startUpstream(ok({ data: [{ id: 'gpt-4o', created: 1 }] })));
    const app = track(
      await startApp({ OPENAI_API_KEY: 'sk-server', OPENAI_BASE_URL: `${upstream.url}/v1` })
    );

    const res = await fetch(`${app.url}/api/proxy/openai/models`, {
      headers: { Authorization: 'Bearer sk-from-browser' },
    });
    expect(res.status).toBe(200);
    expect(upstream.requests[0].url).toBe('/v1/models');
    expect(upstream.requests[0].headers.authorization).toBe('Bearer sk-server');
    expect(JSON.stringify([...res.headers])).not.toContain('sk-server');
    expect(await res.text()).not.toContain('sk-server');
  });

  it('OpenAI: 503 without a key, and only chat/models are reachable', async () => {
    const upstream = track(await startUpstream(ok({})));
    const without = track(await startApp({ OPENAI_BASE_URL: `${upstream.url}/v1` }));
    expect((await fetch(`${without.url}/api/proxy/openai/models`)).status).toBe(503);

    const withKey = track(
      await startApp({ OPENAI_API_KEY: 'sk', OPENAI_BASE_URL: `${upstream.url}/v1` })
    );
    expect((await fetch(`${withKey.url}/api/proxy/openai/files`)).status).toBe(404);
    expect((await fetch(`${withKey.url}/api/proxy/openai/fine_tuning/jobs`)).status).toBe(404);
    expect(upstream.requests).toHaveLength(0);
  });

  it('Anthropic: sends x-api-key and a default anthropic-version', async () => {
    const upstream = track(await startUpstream(ok({ data: [] })));
    const app = track(
      await startApp({ ANTHROPIC_API_KEY: 'ak-server', ANTHROPIC_BASE_URL: upstream.url })
    );
    await fetch(`${app.url}/api/proxy/anthropic/v1/models?limit=100`);
    expect(upstream.requests[0].url).toBe('/v1/models?limit=100');
    expect(upstream.requests[0].headers['x-api-key']).toBe('ak-server');
    expect(upstream.requests[0].headers['anthropic-version']).toBe('2023-06-01');
  });

  it('llama.cpp: /v1/* reaches llama-server, other paths do not', async () => {
    const upstream = track(await startUpstream(ok({ data: [{ id: 'model.gguf' }] })));
    const app = track(await startApp({ LLAMA_SERVER_URL: upstream.url }));

    expect(await readJson(await fetch(`${app.url}/v1/models`))).toEqual({ data: [{ id: 'model.gguf' }] });
    expect(upstream.requests[0].url).toBe('/v1/models');

    expect((await fetch(`${app.url}/v1/props`)).status).toBe(404);
    expect((await fetch(`${app.url}/v1/slots`)).status).toBe(404);
    expect(upstream.requests).toHaveLength(1);
  });

  it('Ollama: /ollama/* maps to the root of the Ollama server; pull/delete are blocked', async () => {
    const upstream = track(await startUpstream(ok({ models: [] })));
    const app = track(await startApp({ OLLAMA_URL: upstream.url }));

    expect((await fetch(`${app.url}/ollama/api/tags`)).status).toBe(200);
    expect(upstream.requests[0].url).toBe('/api/tags');

    await fetch(`${app.url}/ollama/v1/chat/completions`, { method: 'POST', body: '{}' });
    expect(upstream.requests[1].url).toBe('/v1/chat/completions');

    const pull = await fetch(`${app.url}/ollama/api/pull`, { method: 'POST', body: '{}' });
    const del = await fetch(`${app.url}/ollama/api/delete`, { method: 'DELETE' });
    expect(pull.status).toBe(404);
    expect(del.status).toBe(404);
    expect(upstream.requests).toHaveLength(2);
  });
});
