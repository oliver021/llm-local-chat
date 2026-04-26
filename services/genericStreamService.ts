/**
 * Generic OpenAI-compatible SSE streaming client.
 *
 * Used by both llama.cpp and Ollama — both expose the same
 * POST /v1/chat/completions endpoint with SSE streaming.
 *
 * @param baseUrl  Base URL for the completions endpoint, e.g. '/v1' or '/ollama/v1'
 * @param model    Model identifier to pass in the request body
 * @param messages Conversation history (roles must already be mapped: 'ai' → 'assistant')
 * @param onChunk  Called for each text fragment received
 * @param onDone   Called exactly once when the stream ends
 * @param onError  Called on network or parse errors (not called on AbortError)
 * @returns        Cancel function — aborts the in-flight request immediately
 */
export function streamOpenAICompatible(
  baseUrl: string,
  model: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): () => void {
  const controller = new AbortController();

  (async () => {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    if (!response.ok) {
      onError(new Error(`Server error: ${response.status} ${response.statusText}`));
      return;
    }

    const reader = response.body!
      .pipeThrough(new TextDecoderStream())
      .getReader();

    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice('data:'.length).trim();
          if (data === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const text: string = parsed?.choices?.[0]?.delta?.content ?? '';
            if (text) onChunk(text);
          } catch {
            // malformed SSE line — skip silently
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    // Stream ended without [DONE] (some servers omit it)
    onDone();
  })();

  return () => controller.abort();
}
