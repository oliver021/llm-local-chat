import OpenAI from 'openai';

// Lazy-initialise so a missing key doesn't crash on import
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
      dangerouslyAllowBrowser: true,
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
  let cancelled = false;

  const allMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
    : messages;

  (async () => {
    try {
      if (!import.meta.env.VITE_OPENAI_API_KEY) {
        throw new Error('VITE_OPENAI_API_KEY is not set. Add it to .env.local');
      }

      const stream = await getClient().chat.completions.create({
        model,
        stream: true,
        messages: allMessages,
      });

      for await (const chunk of stream) {
        if (cancelled) break;
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) onChunk(text);
      }

      if (!cancelled) onDone();
    } catch (err) {
      if (!cancelled) onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => { cancelled = true; };
}
