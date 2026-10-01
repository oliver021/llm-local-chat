import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { streamOpenAICompatible } from '../../../services/genericStreamService';
import type { AppError } from '../../../types';
import { delta, flush, jsonResponse, mockFetch, openStreamResponse, sseResponse } from './helpers';

const history = [{ role: 'user' as const, content: 'hi' }];

function run(options: { systemPrompt?: string } = {}) {
  const onChunk = vi.fn();
  const onDone = vi.fn();
  const onError = vi.fn();
  const cancel = streamOpenAICompatible('/v1', 'my-model', history, onChunk, onDone, onError, options.systemPrompt);
  return { onChunk, onDone, onError, cancel };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('streamOpenAICompatible: happy path', () => {
  it('posts the conversation and streams tokens until [DONE]', async () => {
    const fetchMock = mockFetch().mockResolvedValue(
      sseResponse([delta('Hel'), delta('lo'), 'data: [DONE]\n\n'])
    );
    const { onChunk, onDone, onError } = run();
    await flush();

    expect(onChunk.mock.calls.map((c) => c[0])).toEqual(['Hel', 'lo']);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init!.body as string)).toEqual({ model: 'my-model', messages: history, stream: true });
  });

  it('prepends the system prompt', async () => {
    const fetchMock = mockFetch().mockResolvedValue(sseResponse(['data: [DONE]\n\n']));
    run({ systemPrompt: 'Be a pirate' });
    await flush();
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Be a pirate' });
    expect(body.messages).toHaveLength(2);
  });

  it('reassembles events split across network chunks', async () => {
    const event = delta('split');
    mockFetch().mockResolvedValue(
      sseResponse([event.slice(0, 12), event.slice(12, 30), event.slice(30), 'data: [DONE]\n\n'])
    );
    const { onChunk, onDone } = run();
    await flush();
    expect(onChunk.mock.calls.map((c) => c[0])).toEqual(['split']);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('skips malformed lines, comments and empty deltas', async () => {
    mockFetch().mockResolvedValue(
      sseResponse([
        ': keep-alive\n\n',
        'data: {broken\n\n',
        'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
        delta('ok'),
        'data: [DONE]\n\n',
      ])
    );
    const { onChunk, onError } = run();
    await flush();
    expect(onChunk.mock.calls.map((c) => c[0])).toEqual(['ok']);
    expect(onError).not.toHaveBeenCalled();
  });

  it('finishes when the server closes the stream without [DONE]', async () => {
    mockFetch().mockResolvedValue(sseResponse([delta('bye')]));
    const { onChunk, onDone } = run();
    await flush();
    expect(onChunk).toHaveBeenCalledWith('bye');
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('streamOpenAICompatible: errors', () => {
  const lastError = (onError: ReturnType<typeof vi.fn>) => onError.mock.calls[0][0] as AppError;

  it('shows our server’s message when the model server is unreachable (502)', async () => {
    mockFetch().mockResolvedValue(
      jsonResponse({ type: 'error', error: { type: 'upstream_unreachable', message: 'Could not reach Ollama at http://x:11434. Is it running?' } }, 502)
    );
    const { onError, onDone } = run();
    await flush();
    const err = lastError(onError);
    expect(err.code).toBe('NETWORK_UNREACHABLE');
    expect(err.userMessage).toBe('Could not reach Ollama at http://x:11434. Is it running?');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('maps 504 to a timeout', async () => {
    mockFetch().mockResolvedValue(jsonResponse({ error: { message: 'did not respond' } }, 504));
    const { onError } = run();
    await flush();
    expect(lastError(onError).code).toBe('NETWORK_TIMEOUT');
  });

  it('maps 401/403 to an auth error', async () => {
    mockFetch().mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401));
    const { onError } = run();
    await flush();
    expect(lastError(onError).code).toBe('AUTH_INVALID');
  });

  it('includes the model server’s own explanation for other failures', async () => {
    mockFetch().mockResolvedValue(
      jsonResponse({ error: { message: "model 'llama9' not found" } }, 404)
    );
    const { onError } = run();
    await flush();
    const err = lastError(onError);
    expect(err.code).toBe('MODEL_ERROR');
    expect(err.userMessage).toBe("Model server error (404): model 'llama9' not found");
  });

  it('falls back to a generic message for an empty error body', async () => {
    mockFetch().mockResolvedValue(new Response('', { status: 500 }));
    const { onError } = run();
    await flush();
    expect(lastError(onError).userMessage).toMatch(/returned an error \(500\)/);
  });

  it('reports a network failure when fetch itself rejects', async () => {
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'));
    const { onError } = run();
    await flush();
    expect(lastError(onError).code).toBe('NETWORK_UNREACHABLE');
  });

  it('gives up with a timeout after 30 s of silence', async () => {
    vi.useFakeTimers();
    mockFetch().mockImplementation(async (_url, init) => openStreamResponse(init?.signal));
    const { onError, onChunk } = run();
    await vi.advanceTimersByTimeAsync(29_000);
    expect(onError).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(lastError(onError).code).toBe('NETWORK_TIMEOUT');
    expect(onChunk).not.toHaveBeenCalled();
  });
});

describe('streamOpenAICompatible: cancel', () => {
  let signal: AbortSignal | null | undefined;

  beforeEach(() => {
    signal = undefined;
    mockFetch().mockImplementation(async (_url, init) => {
      signal = init?.signal;
      return openStreamResponse(init?.signal, delta('first'));
    });
  });

  it('aborts the request and stays silent afterwards', async () => {
    const { onChunk, onDone, onError, cancel } = run();
    await flush();
    expect(onChunk).toHaveBeenCalledWith('first');

    cancel();
    await flush();

    expect(signal?.aborted).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
