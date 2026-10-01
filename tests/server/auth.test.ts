import { afterEach, describe, expect, it } from 'vitest';
import { startApp, startUpstream, type RunningServer } from './helpers.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((fn) => fn()));
});
const track = <T extends RunningServer>(s: T): T => {
  cleanup.push(s.close);
  return s;
};

const basic = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

describe('basic auth', () => {
  it('is off unless AUTH_PASSWORD is set', async () => {
    const app = track(await startApp());
    expect((await fetch(`${app.url}/api/chats`)).status).toBe(200);
  });

  it('challenges requests without credentials', async () => {
    const app = track(await startApp({ AUTH_PASSWORD: 'hunter2' }));
    const res = await fetch(`${app.url}/api/chats`);
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(/^Basic realm=/);
  });

  it('accepts the right credentials and rejects wrong ones', async () => {
    const app = track(await startApp({ AUTH_USER: 'alice', AUTH_PASSWORD: 'hunter2' }));
    const get = (auth: string) => fetch(`${app.url}/api/chats`, { headers: { Authorization: auth } });

    expect((await get(basic('alice', 'hunter2'))).status).toBe(200);
    expect((await get(basic('alice', 'wrong'))).status).toBe(401);
    expect((await get(basic('bob', 'hunter2'))).status).toBe(401);
    expect((await get(basic('alice', 'hunter2 '))).status).toBe(401);
    expect((await get('Bearer hunter2')).status).toBe(401);
    expect((await get('Basic !!!not-base64!!!')).status).toBe(401);
  });

  it('defaults the user name to "admin"', async () => {
    const app = track(await startApp({ AUTH_PASSWORD: 'pw' }));
    const res = await fetch(`${app.url}/api/chats`, { headers: { Authorization: basic('admin', 'pw') } });
    expect(res.status).toBe(200);
  });

  it('keeps /api/health open for container health checks', async () => {
    const app = track(await startApp({ AUTH_PASSWORD: 'pw' }));
    expect((await fetch(`${app.url}/api/health`)).status).toBe(200);
  });

  it('also protects the provider proxies, so the API key cannot be used anonymously', async () => {
    const upstream = track(await startUpstream((_req, res) => res.end('{}')));
    const app = track(
      await startApp({
        AUTH_PASSWORD: 'pw',
        OPENAI_API_KEY: 'sk',
        OPENAI_BASE_URL: `${upstream.url}/v1`,
        LLAMA_SERVER_URL: upstream.url,
      })
    );
    expect((await fetch(`${app.url}/api/proxy/openai/models`)).status).toBe(401);
    expect((await fetch(`${app.url}/v1/models`)).status).toBe(401);
    expect(upstream.requests).toHaveLength(0);

    const authed = await fetch(`${app.url}/api/proxy/openai/models`, {
      headers: { Authorization: basic('admin', 'pw') },
    });
    expect(authed.status).toBe(200);
  });
});
