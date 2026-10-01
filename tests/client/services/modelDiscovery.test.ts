import { afterEach, describe, expect, it } from 'vitest';
import {
  CLAUDE_FALLBACK_MODELS,
  checkProviderStatus,
  discoverClaudeModels,
  discoverOllamaModels,
  discoverOpenAiModels,
  fetchHuggingFaceGGUFs,
  fetchLlamaServerModels,
  fetchOllamaRegistry,
  formatDownloads,
} from '../../../services/modelDiscovery';
import { jsonResponse, mockFetch } from './helpers';
import { vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

/** Route fetch() by URL substring. */
function route(routes: Record<string, () => Response | Promise<Response>>) {
  return mockFetch().mockImplementation(async (input) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) throw new TypeError(`unexpected fetch: ${url}`);
    return routes[key]();
  });
}

describe('formatDownloads', () => {
  it.each([
    [999, '999'],
    [1_000, '1K'],
    [12_345, '12K'],
    [1_500_000, '1.5M'],
  ])('%i → %s', (n, expected) => expect(formatDownloads(n)).toBe(expected));
});

describe('local model servers', () => {
  it('lists llama-server models through our proxy', async () => {
    const fetchMock = route({ '/v1/models': () => jsonResponse({ data: [{ id: 'qwen.gguf' }] }) });
    expect(await fetchLlamaServerModels()).toEqual([{ id: 'qwen.gguf', name: 'qwen.gguf', source: 'local' }]);
    expect(String(fetchMock.mock.calls[0][0])).toBe('/v1/models');
  });

  it('returns an empty list when llama-server is unreachable (502) or fetch fails', async () => {
    route({ '/v1/models': () => jsonResponse({ error: { message: 'down' } }, 502) });
    expect(await fetchLlamaServerModels()).toEqual([]);
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchLlamaServerModels()).toEqual([]);
  });

  it('shows installed Ollama models first, then registry suggestions not yet installed', async () => {
    route({
      '/ollama/api/tags': () =>
        jsonResponse({ models: [{ name: 'mistral', size: 4_100_000_000 }, { name: 'custom:7b', size: 500 * 1024 * 1024 }] }),
    });
    const models = await discoverOllamaModels();
    expect(models.slice(0, 2)).toEqual([
      { id: 'mistral', name: 'mistral', size: '3.8 GB', source: 'local', installed: true },
      { id: 'custom:7b', name: 'custom:7b', size: '500 MB', source: 'local', installed: true },
    ]);
    const suggested = models.filter((m) => !m.installed);
    expect(suggested.length).toBeGreaterThan(0);
    expect(suggested.some((m) => m.id === 'mistral')).toBe(false);
  });

  it('falls back to suggestions when Ollama is not reachable', async () => {
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'));
    const models = await discoverOllamaModels();
    expect(models.every((m) => m.source === 'ollama-registry')).toBe(true);
  });

  it('searches the built-in Ollama library by name and description', async () => {
    expect((await fetchOllamaRegistry('qwen')).every((m) => /qwen/i.test(m.name + m.description))).toBe(true);
    expect((await fetchOllamaRegistry('  LLAMA3.2 ')).map((m) => m.name)).toContain('llama3.2');
    expect(await fetchOllamaRegistry('zzzz-no-such-model')).toEqual([]);
    expect((await fetchOllamaRegistry()).length).toBeGreaterThan(20);
  });
});

describe('OpenAI discovery (through the server proxy)', () => {
  const models = {
    data: [
      { id: 'gpt-4o', created: 100 },
      { id: 'gpt-5', created: 300 },
      { id: 'o3-mini', created: 200 },
      { id: 'text-embedding-3-small', created: 400 },
      { id: 'gpt-4o-mini-tts', created: 500 },
      { id: 'gpt-image-1', created: 600 },
      { id: 'whisper-1', created: 50 },
      { id: 'dall-e-3', created: 60 },
      { id: 'gpt-3.5-turbo-instruct', created: 70 },
      { id: 'chatgpt-4o-latest', created: 150 },
    ],
  };

  it('keeps chat models only, newest first', async () => {
    const fetchMock = route({ '/api/proxy/openai/models': () => jsonResponse(models) });
    const result = await discoverOpenAiModels();
    expect(result.map((m) => m.id)).toEqual(['gpt-5', 'o3-mini', 'chatgpt-4o-latest', 'gpt-4o']);
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/proxy/openai/models');
  });

  it('surfaces the server’s message when the key is missing', async () => {
    route({
      '/api/proxy/openai/models': () =>
        jsonResponse({ type: 'error', error: { type: 'not_configured', message: 'OPENAI_API_KEY is not set on the server' } }, 503),
    });
    await expect(discoverOpenAiModels()).rejects.toThrow('OPENAI_API_KEY is not set on the server');
  });

  it('has a sensible message for an empty error body', async () => {
    route({ '/api/proxy/openai/models': () => new Response('', { status: 500 }) });
    await expect(discoverOpenAiModels()).rejects.toThrow('OpenAI API error: 500');
  });
});

describe('Anthropic discovery', () => {
  it('lists the models the API reports, with display names', async () => {
    route({
      '/api/proxy/anthropic/v1/models': () =>
        jsonResponse({ data: [{ id: 'claude-x-1', display_name: 'Claude X 1' }, { id: 'claude-y' }] }),
    });
    expect(await discoverClaudeModels()).toEqual([
      { id: 'claude-x-1', name: 'Claude X 1', source: 'anthropic' },
      { id: 'claude-y', name: 'claude-y', source: 'anthropic' },
    ]);
  });

  it('falls back to the built-in list on errors or an empty answer', async () => {
    route({ '/api/proxy/anthropic': () => jsonResponse({ error: { message: 'no key' } }, 503) });
    expect(await discoverClaudeModels()).toBe(CLAUDE_FALLBACK_MODELS);

    route({ '/api/proxy/anthropic': () => jsonResponse({ data: [] }) });
    expect(await discoverClaudeModels()).toBe(CLAUDE_FALLBACK_MODELS);

    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await discoverClaudeModels()).toBe(CLAUDE_FALLBACK_MODELS);
  });
});

describe('checkProviderStatus', () => {
  it('reads cloud key status from /api/providers (booleans only)', async () => {
    route({ '/api/providers': () => jsonResponse({ openai: { configured: true }, anthropic: { configured: false } }) });
    expect(await checkProviderStatus('llm-openai')).toBe('connected');
    expect(await checkProviderStatus('llm-claude')).toBe('no-key');
  });

  it('reports local servers as connected or offline', async () => {
    route({ '/v1/models': () => jsonResponse({ data: [] }), '/ollama/api/tags': () => jsonResponse({}, 502) });
    expect(await checkProviderStatus('llm-llamacpp')).toBe('connected');
    expect(await checkProviderStatus('llm-ollama')).toBe('offline');
  });

  it('reports offline when the backend itself is unreachable', async () => {
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await checkProviderStatus('llm-openai')).toBe('offline');
    expect(await checkProviderStatus('llm-llamacpp')).toBe('offline');
  });
});

describe('Hugging Face GGUF browser', () => {
  const hf = [
    {
      id: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
      downloads: 1234,
      likes: 5,
      siblings: [
        { rfilename: 'Llama-3.2-1B-Instruct-Q8_0.gguf', size: 1_300_000_000 },
        { rfilename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf', size: 800 * 1024 * 1024 },
        { rfilename: 'README.md' },
      ],
    },
    { id: 'someone/NoFiles-GGUF', downloads: 9, likes: 0 },
  ];

  it('builds one card per repo, preferring Q4_K_M, and keeps other quantizations as variants', async () => {
    const fetchMock = route({ 'huggingface.co/api/models': () => jsonResponse(hf) });
    const cards = await fetchHuggingFaceGGUFs('llama 3');

    expect(String(fetchMock.mock.calls[0][0])).toContain('search=llama+3');
    expect(cards).toHaveLength(2);

    const [llama, bare] = cards;
    expect(llama).toMatchObject({
      id: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
      name: 'Llama-3.2-1B-Instruct-GGUF',
      quantization: 'Q4_K_M',
      size: '800 MB',
      hfRepoId: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
      downloadUrl: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    });
    expect(llama.allVariants?.map((v) => v.quantization)).toEqual(['Q8_0']);
    expect(bare).toMatchObject({ id: 'someone/NoFiles-GGUF', downloadUrl: 'https://huggingface.co/someone/NoFiles-GGUF' });
  });

  it('returns nothing when Hugging Face is unreachable', async () => {
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchHuggingFaceGGUFs()).toEqual([]);
    route({ 'huggingface.co': () => new Response('', { status: 500 }) });
    expect(await fetchHuggingFaceGGUFs()).toEqual([]);
  });
});
