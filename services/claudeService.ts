import type Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_PROXY_PATH, proxyBaseUrl, toProviderError } from './providerErrors';

// Created on first use. The SDK is loaded lazily too: most people run local
// models and never need it, so it stays out of the initial bundle.
let _client: Anthropic | null = null;

async function getClient(): Promise<Anthropic> {
  if (!_client) {
    const { default: AnthropicClient } = await import('@anthropic-ai/sdk');
    _client = new AnthropicClient({
      // The real API key lives on the server, which adds it to proxied requests.
      // The SDK just insists on a non-empty value.
      apiKey: 'managed-by-server',
      baseURL: proxyBaseUrl(ANTHROPIC_PROXY_PATH),
      // Normally this flag exists to warn about secrets in the browser; there is none here.
      dangerouslyAllowBrowser: true,
      // The SDK retries 5xx responses with a delay. Our proxy answers 502/503/504 for
      // problems retrying cannot fix (key missing, upstream down), so show them at once.
      maxRetries: 0,
    });
  }
  return _client;
}

export function streamClaudeResponse(
  model: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  systemPrompt?: string
): () => void {
  const controller = new AbortController();
  let cancelled = false;

  (async () => {
    try {
      const client = await getClient();
      const stream = client.messages.stream(
        {
          model,
          max_tokens: 2048,
          messages,
          ...(systemPrompt ? { system: systemPrompt } : {}),
        },
        { signal: controller.signal }
      );

      stream.on('text', (text) => {
        if (!cancelled) onChunk(text);
      });

      await stream.finalMessage();
      if (!cancelled) onDone();
    } catch (err) {
      if (!cancelled) onError(toProviderError('Anthropic', err));
    }
  })();

  // Aborting closes the connection, which makes the server cancel the upstream request.
  return () => {
    cancelled = true;
    controller.abort();
  };
}
