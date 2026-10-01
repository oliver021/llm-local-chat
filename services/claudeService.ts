import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_PROXY_PATH, proxyBaseUrl, toProviderError } from './providerErrors';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      // The real API key lives on the server, which adds it to proxied requests.
      // The SDK just insists on a non-empty value.
      apiKey: 'managed-by-server',
      baseURL: proxyBaseUrl(ANTHROPIC_PROXY_PATH),
      // Normally this flag exists to warn about secrets in the browser; there is none here.
      dangerouslyAllowBrowser: true,
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
      const stream = getClient().messages.stream(
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
