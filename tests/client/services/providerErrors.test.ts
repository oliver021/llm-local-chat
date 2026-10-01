import { describe, expect, it } from 'vitest';
import { makeAppError } from '../../../types';
import { toProviderError } from '../../../services/providerErrors';

const sdkError = (status: number | undefined, message: string) =>
  Object.assign(new Error(message), { status });

describe('toProviderError', () => {
  it('tells the user to configure the key when the server has none', () => {
    const err = toProviderError('OpenAI', sdkError(503, '503 OPENAI_API_KEY is not set on the server'));
    expect(err.code).toBe('AUTH_MISSING');
    expect(err.userMessage).toBe('OpenAI is not configured. Add its API key to .env and restart the server.');
  });

  it('distinguishes our 503 from the provider’s own overload 503', () => {
    const err = toProviderError('OpenAI', sdkError(503, '503 The server is overloaded'));
    expect(err.code).toBe('MODEL_ERROR');
  });

  it.each([401, 403])('maps %i to an invalid-key error', (status) => {
    const err = toProviderError('Anthropic', sdkError(status, 'invalid x-api-key'));
    expect(err.code).toBe('AUTH_INVALID');
    expect(err.userMessage).toContain('Anthropic rejected the API key');
  });

  it('marks rate limits retryable', () => {
    const err = toProviderError('OpenAI', sdkError(429, 'slow down'));
    expect(err.userMessage).toContain('rate limit');
    expect(err.retryable).toBe(true);
  });

  it('maps gateway failures and fetch failures to network errors', () => {
    expect(toProviderError('OpenAI', sdkError(502, 'bad gateway')).code).toBe('NETWORK_UNREACHABLE');
    expect(toProviderError('OpenAI', sdkError(504, 'timeout')).code).toBe('NETWORK_TIMEOUT');
    expect(toProviderError('OpenAI', new TypeError('Failed to fetch')).code).toBe('NETWORK_UNREACHABLE');
  });

  it('passes everything else through with the provider’s message', () => {
    const err = toProviderError('OpenAI', sdkError(400, 'context length exceeded'));
    expect(err.code).toBe('MODEL_ERROR');
    expect(err.userMessage).toBe('OpenAI returned an error: context length exceeded');
  });

  it('leaves errors that are already AppErrors alone', () => {
    const original = makeAppError('x', 'DB_WRITE_FAILED');
    expect(toProviderError('OpenAI', original)).toBe(original);
  });

  it('copes with non-Error values', () => {
    expect(toProviderError('OpenAI', 'boom').userMessage).toContain('boom');
  });
});
