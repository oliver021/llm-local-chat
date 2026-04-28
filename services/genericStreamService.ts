import type { AppError } from '../types';

const INACTIVITY_TIMEOUT_MS = 30_000;

function makeStreamError(message: string, code: AppError['code'], userMessage: string): AppError {
  const err = new Error(message) as AppError;
  err.code = code;
  err.userFacing = true;
  err.userMessage = userMessage;
  err.retryable = true;
  return err;
}

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
  onError: (err: Error) => void,
  systemPrompt?: string
): () => void {
  const controller = new AbortController();
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
  }

  function resetTimer() {
    clearTimer();
    inactivityTimer = setTimeout(() => {
      controller.abort();
      onError(makeStreamError(
        'Stream inactivity timeout',
        'NETWORK_TIMEOUT',
        'The model stopped responding for 30 seconds. Try sending again.'
      ));
    }, INACTIVITY_TIMEOUT_MS);
  }

  const allMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
    : messages;

  (async () => {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: allMessages, stream: true }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimer();
      if ((err as Error).name === 'AbortError') return;
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('econnrefused')) {
        onError(makeStreamError(
          'Network unreachable',
          'NETWORK_UNREACHABLE',
          'Could not reach the model server. Make sure it is running and accessible.'
        ));
      } else {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
      return;
    }

    if (!response.ok) {
      clearTimer();
      const code: AppError['code'] = response.status === 401 || response.status === 403
        ? 'AUTH_INVALID'
        : 'MODEL_ERROR';
      onError(makeStreamError(
        `Server error: ${response.status} ${response.statusText}`,
        code,
        `Model server returned an error (${response.status}). Check your model and provider settings.`
      ));
      return;
    }

    // Start inactivity timer once connection is established
    resetTimer();

    const reader = response.body!
      .pipeThrough(new TextDecoderStream())
      .getReader();

    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        resetTimer();
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice('data:'.length).trim();
          if (data === '[DONE]') {
            clearTimer();
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
      clearTimer();
      if ((err as Error).name === 'AbortError') return;
      onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    // Stream ended without [DONE] (some servers omit it)
    clearTimer();
    onDone();
  })();

  return () => { clearTimer(); controller.abort(); };
}
