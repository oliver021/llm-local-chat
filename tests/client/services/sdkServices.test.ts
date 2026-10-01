import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppError } from '../../../types';
import { flush, jsonResponse, mockFetch, openStreamResponse, sseResponse } from './helpers';

/**
 * These run the real OpenAI and Anthropic SDKs with only fetch() replaced, so they check
 * what actually goes over the wire: our proxy URLs, no real key, and the error mapping.
 */

type StreamFn = (
  model: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  systemPrompt?: string
) => () => void;

let streamOpenAiResponse: StreamFn;
let streamClaudeResponse: StreamFn;

// Each service keeps its SDK client in a module variable, and an SDK client remembers the fetch it
// was built with. Load fresh modules per test so every test's fetch stub is the one that is used.
beforeEach(async () => {
  vi.resetModules();
  ({ streamOpenAiResponse } = await import('../../../services/openAiService'));
  ({ streamClaudeResponse } = await import('../../../services/claudeService'));
});

afterEach(() => vi.unstubAllGlobals());

const history = [{ role: 'user' as const, content: 'hi' }];
const origin = window.location.origin;

const openAiChunk = (content: string) =>
  `data: ${JSON.stringify({ id: 'c', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content } }] })}\n\n`;

const claudeEvents = (text: string) => [
  `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-x', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } })}\n\n`,
  `event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`,
  `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })}\n\n`,
  `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`,
  `event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 2 } })}\n\n`,
  `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
];

/** Give anything still pending (callbacks that must NOT fire) a few turns of the event loop. */
async function settle(times = 5) {
  for (let i = 0; i < times; i++) await flush();
}

/** The SDK is imported lazily, so the first request can take a while: wait for the real condition. */
const until = (assertion: () => void) => vi.waitFor(assertion, { timeout: 5000 });

function run(stream: StreamFn, systemPrompt?: string) {
  const onChunk = vi.fn();
  const onDone = vi.fn();
  const onError = vi.fn();
  const cancel = stream('some-model', history, onChunk, onDone, onError, systemPrompt);
  return { onChunk, onDone, onError, cancel };
}

describe('OpenAI service', () => {
  it('streams through our proxy with a placeholder key, never a real one', async () => {
    const fetchMock = mockFetch().mockResolvedValue(
      sseResponse([openAiChunk('Hel'), openAiChunk('lo'), 'data: [DONE]\n\n'])
    );
    const { onChunk, onDone, onError } = run(streamOpenAiResponse, 'Be brief');
    await until(() => expect(onDone).toHaveBeenCalled());

    expect(onChunk.mock.calls.map((c) => c[0])).toEqual(['Hel', 'lo']);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${origin}/api/proxy/openai/chat/completions`);
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe('Bearer managed-by-server');
    const body = JSON.parse(init!.body as string);
    expect(body).toMatchObject({ model: 'some-model', stream: true });
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Be brief' });
  });

  it('explains a missing server-side key', async () => {
    mockFetch().mockResolvedValue(
      jsonResponse({ type: 'error', error: { type: 'not_configured', message: 'OPENAI_API_KEY is not set on the server' } }, 503)
    );
    const { onError, onDone } = run(streamOpenAiResponse);
    await until(() => expect(onError).toHaveBeenCalled());

    const err = onError.mock.calls[0][0] as AppError;
    expect(err.code).toBe('AUTH_MISSING');
    expect(err.userMessage).toBe('OpenAI is not configured. Add its API key to .env and restart the server.');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reports a rejected key', async () => {
    mockFetch().mockResolvedValue(jsonResponse({ error: { message: 'Incorrect API key provided' } }, 401));
    const { onError } = run(streamOpenAiResponse);
    await until(() => expect(onError).toHaveBeenCalled());
    expect((onError.mock.calls[0][0] as AppError).code).toBe('AUTH_INVALID');
  });

  it('Stop aborts the request and silences every callback', async () => {
    let signal: AbortSignal | null | undefined;
    mockFetch().mockImplementation(async (_url, init) => {
      signal = init?.signal;
      return openStreamResponse(init?.signal, openAiChunk('first'));
    });
    const { onChunk, onDone, onError, cancel } = run(streamOpenAiResponse);
    await until(() => expect(onChunk).toHaveBeenCalledWith('first'));

    cancel();
    await until(() => expect(signal?.aborted).toBe(true));
    await settle();
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('Claude service', () => {
  it('streams through our proxy and sends the system prompt', async () => {
    const fetchMock = mockFetch().mockResolvedValue(sseResponse(claudeEvents('Hello')));
    const { onChunk, onDone, onError } = run(streamClaudeResponse, 'Be brief');
    await until(() => expect(onDone).toHaveBeenCalled());

    expect(onChunk).toHaveBeenCalledWith('Hello');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${origin}/api/proxy/anthropic/v1/messages`);
    const headers = new Headers(init?.headers);
    expect(headers.get('x-api-key')).toBe('managed-by-server');
    expect(JSON.parse(init!.body as string)).toMatchObject({
      model: 'some-model',
      stream: true,
      system: 'Be brief',
      messages: history,
    });
  });

  it('explains a missing server-side key', async () => {
    mockFetch().mockResolvedValue(
      jsonResponse({ type: 'error', error: { type: 'not_configured', message: 'ANTHROPIC_API_KEY is not set on the server' } }, 503)
    );
    const { onError } = run(streamClaudeResponse);
    await until(() => expect(onError).toHaveBeenCalled());

    const err = onError.mock.calls[0][0] as AppError;
    expect(err.code).toBe('AUTH_MISSING');
    expect(err.userMessage).toContain('Anthropic is not configured');
  });

  it('Stop aborts the request and silences every callback', async () => {
    let signal: AbortSignal | null | undefined;
    mockFetch().mockImplementation(async (_url, init) => {
      signal = init?.signal;
      return openStreamResponse(init?.signal, claudeEvents('partial').slice(0, 3).join(''));
    });
    const { onDone, onError, cancel } = run(streamClaudeResponse);
    await until(() => expect(signal).toBeDefined());

    cancel();
    await until(() => expect(signal?.aborted).toBe(true));
    await settle();

    expect(onDone).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
