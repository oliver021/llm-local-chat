import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? '',
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
  onError: (err: Error) => void
): () => void {
  let cancelled = false;

  (async () => {
    try {
      if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
        throw new Error('VITE_ANTHROPIC_API_KEY is not set. Add it to .env.local');
      }

      const stream = getClient().messages.stream({
        model,
        max_tokens: 2048,
        messages,
      });

      stream.on('text', (text) => {
        if (!cancelled) onChunk(text);
      });

      await stream.finalMessage();
      if (!cancelled) onDone();
    } catch (err) {
      if (!cancelled) onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => { cancelled = true; };
}
