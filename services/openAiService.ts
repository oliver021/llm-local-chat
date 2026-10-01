import type OpenAI from 'openai';
import { OPENAI_PROXY_PATH, proxyBaseUrl, toProviderError } from './providerErrors';

// Created on first use. The SDK is loaded lazily too: most people run local
// models and never need it, so it stays out of the initial bundle.
let _client: OpenAI | null = null;

async function getClient(): Promise<OpenAI> {
  if (!_client) {
    const { default: OpenAIClient } = await import('openai');
    _client = new OpenAIClient({
      // The real API key lives on the server, which adds it to proxied requests.
      // The SDK just insists on a non-empty value.
      apiKey: 'managed-by-server',
      baseURL: proxyBaseUrl(OPENAI_PROXY_PATH),
      // Normally this flag exists to warn about secrets in the browser; there is none here.
      dangerouslyAllowBrowser: true,
      // The SDK retries 5xx responses with a delay. Our proxy answers 502/503/504 for
      // problems retrying cannot fix (key missing, upstream down), so show them at once.
      maxRetries: 0,
    });
  }
  return _client;
}

export function streamOpenAiResponse(
  model: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  systemPrompt?: string
): () => void {
  const controller = new AbortController();
  let cancelled = false;

  const allMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
    : messages;

  (async () => {
    try {
      const client = await getClient();
      const stream = await client.chat.completions.create(
        { model, stream: true, messages: allMessages },
        { signal: controller.signal }
      );

      for await (const chunk of stream) {
        if (cancelled) break;
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) onChunk(text);
      }

      if (!cancelled) onDone();
    } catch (err) {
      if (!cancelled) onError(toProviderError('OpenAI', err));
    }
  })();

  // Aborting closes the connection, which makes the server cancel the upstream request.
  return () => {
    cancelled = true;
    controller.abort();
  };
}
