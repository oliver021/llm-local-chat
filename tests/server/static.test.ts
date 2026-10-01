import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApp, type TestApp } from './helpers.js';

let withUi: TestApp;
let withoutUi: TestApp;

beforeAll(async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Aura</title><div id="root"></div>');
  fs.writeFileSync(path.join(dist, 'assets', 'app-abc123.js'), 'console.log(1)');
  fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *');

  withUi = await startApp({ DIST_DIR: dist });
  withoutUi = await startApp({ DIST_DIR: path.join(dist, 'missing') });
});
afterAll(async () => {
  await withUi.close();
  await withoutUi.close();
});

describe('serving the built frontend', () => {
  it('serves index.html at / without caching it', async () => {
    const res = await fetch(`${withUi.url}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<div id="root">');
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  it('falls back to index.html for client-side routes', async () => {
    const res = await fetch(`${withUi.url}/some/deep/route`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<div id="root">');
  });

  it('caches fingerprinted assets forever and other files not at all', async () => {
    const asset = await fetch(`${withUi.url}/assets/app-abc123.js`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');

    const robots = await fetch(`${withUi.url}/robots.txt`);
    expect(robots.headers.get('cache-control')).toBe('no-cache');
  });

  it('returns a real 404 for a missing file instead of index.html', async () => {
    for (const p of ['/assets/missing-abc123.js', '/favicon.ico']) {
      const res = await fetch(`${withUi.url}${p}`);
      expect(res.status, p).toBe(404);
      expect(res.headers.get('content-type'), p).not.toContain('text/html');
    }
  });

  it('never serves index.html for API-looking paths; they get a JSON 404', async () => {
    for (const p of ['/api/nope', '/api', '/v1', '/ollama/whatever']) {
      const res = await fetch(`${withUi.url}${p}`);
      expect(res.status, p).toBe(404);
      expect(res.headers.get('content-type'), p).toContain('application/json');
    }
  });

  it('does not serve files outside the dist directory', async () => {
    const res = await fetch(`${withUi.url}/..%2f..%2fetc/passwd`);
    expect(await res.text()).not.toContain('root:');
  });

  it('sets security headers, including a CSP that blocks inline scripts', async () => {
    const res = await fetch(`${withUi.url}/`);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});

describe('install location', () => {
  it('serves the UI even when the path to it contains a dot-directory', async () => {
    // Express refuses to sendFile() absolute paths with a hidden segment, e.g. ~/.projects/app/dist
    const dist = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dots-')), '.hidden', 'dist');
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><div id="root"></div>');

    const app = await startApp({ DIST_DIR: dist });
    try {
      for (const route of ['/', '/some/route']) {
        const res = await fetch(`${app.url}${route}`);
        expect(res.status, route).toBe(200);
        expect(await res.text()).toContain('<div id="root">');
      }
    } finally {
      await app.close();
    }
  });
});

describe('without a built frontend', () => {
  it('explains what to do instead of a blank 404', async () => {
    const res = await fetch(`${withoutUi.url}/`);
    expect(res.status).toBe(404);
    expect(await res.text()).toMatch(/npm run build/);
  });

  it('still serves the API', async () => {
    expect((await fetch(`${withoutUi.url}/api/health`)).status).toBe(200);
  });
});

describe('/api/providers', () => {
  it('reports which keys are configured and never includes them', async () => {
    const app = await startApp({ OPENAI_API_KEY: 'sk-secret-1', ANTHROPIC_API_KEY: '' });
    try {
      const res = await fetch(`${app.url}/api/providers`);
      const text = await res.text();
      expect(JSON.parse(text)).toEqual({
        openai: { configured: true },
        anthropic: { configured: false },
      });
      expect(text).not.toContain('sk-secret-1');
    } finally {
      await app.close();
    }
  });
});
