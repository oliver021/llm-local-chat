import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigError, isLoopback, loadConfig } from '../../server/config.js';
import { loadEnvFiles } from '../../server/env.js';

describe('loadConfig', () => {
  it('has safe, local defaults', () => {
    const c = loadConfig({}, '/work');
    expect(c).toMatchObject({
      port: 3001,
      host: '127.0.0.1',
      dataDir: '/work/data',
      distDir: '/work/dist',
      corsOrigins: [],
      auth: null,
      llamaServerUrl: 'http://localhost:8080',
      ollamaUrl: 'http://localhost:11434',
    });
    expect(c.openai).toEqual({ baseUrl: 'https://api.openai.com/v1', apiKey: undefined });
    expect(c.anthropic).toEqual({ baseUrl: 'https://api.anthropic.com', apiKey: undefined });
  });

  it('reads overrides and resolves relative directories against cwd', () => {
    const c = loadConfig(
      { PORT: '4000', HOST: '0.0.0.0', DATA_DIR: 'state', DIST_DIR: '/srv/ui', OPENAI_API_KEY: 'sk-1' },
      '/work'
    );
    expect(c).toMatchObject({ port: 4000, host: '0.0.0.0', dataDir: '/work/state', distDir: '/srv/ui' });
    expect(c.openai.apiKey).toBe('sk-1');
  });

  it('treats empty and whitespace-only values as unset (KEY= in .env files)', () => {
    const c = loadConfig({ OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '   ', PORT: '', AUTH_PASSWORD: '' });
    expect(c.openai.apiKey).toBeUndefined();
    expect(c.anthropic.apiKey).toBeUndefined();
    expect(c.port).toBe(3001);
    expect(c.auth).toBeNull();
  });

  it('strips trailing slashes from upstream URLs', () => {
    const c = loadConfig({ LLAMA_SERVER_URL: 'http://gpu-box:8080//', OPENAI_BASE_URL: 'https://x.test/v1/' });
    expect(c.llamaServerUrl).toBe('http://gpu-box:8080');
    expect(c.openai.baseUrl).toBe('https://x.test/v1');
  });

  it('rejects bad ports and URLs with a message naming the variable', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/);
    expect(() => loadConfig({ LLAMA_SERVER_URL: 'not a url' })).toThrow(/LLAMA_SERVER_URL/);
    expect(() => loadConfig({ OLLAMA_URL: 'ftp://host' })).toThrow(/OLLAMA_URL.*http/);
  });

  it('enables auth only with a password and defaults the user to admin', () => {
    expect(loadConfig({ AUTH_USER: 'alice' }).auth).toBeNull();
    expect(loadConfig({ AUTH_PASSWORD: 'pw' }).auth).toEqual({ user: 'admin', password: 'pw' });
    expect(loadConfig({ AUTH_USER: 'alice', AUTH_PASSWORD: 'pw' }).auth).toEqual({
      user: 'alice',
      password: 'pw',
    });
  });

  it('parses a comma-separated CORS_ORIGIN list', () => {
    const c = loadConfig({ CORS_ORIGIN: 'http://a.test, http://b.test ,' });
    expect(c.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
  });

  it('knows which hosts are loopback', () => {
    expect(isLoopback('127.0.0.1')).toBe(true);
    expect(isLoopback('localhost')).toBe(true);
    expect(isLoopback('0.0.0.0')).toBe(false);
    expect(isLoopback('192.168.1.5')).toBe(false);
  });
});

describe('loadEnvFiles', () => {
  const touched = ['ENVTEST_A', 'ENVTEST_B', 'ENVTEST_C'];
  afterEach(() => {
    for (const key of touched) delete process.env[key];
  });

  it('loads .env and .env.local; .env.local wins; the real environment wins over both', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envtest-'));
    fs.writeFileSync(path.join(dir, '.env'), 'ENVTEST_A=from-env\nENVTEST_B=from-env\nENVTEST_C=from-env\n');
    fs.writeFileSync(path.join(dir, '.env.local'), 'ENVTEST_B=from-local\nENVTEST_C=from-local\n');
    process.env.ENVTEST_C = 'from-process';

    expect(loadEnvFiles(dir)).toEqual(['.env.local', '.env']);
    expect(process.env.ENVTEST_A).toBe('from-env');
    expect(process.env.ENVTEST_B).toBe('from-local');
    expect(process.env.ENVTEST_C).toBe('from-process');
  });

  it('is fine when neither file exists', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envtest-'));
    expect(loadEnvFiles(dir)).toEqual([]);
  });
});
