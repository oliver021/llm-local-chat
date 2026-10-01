import { vi } from 'vitest';

const encoder = new TextEncoder();

/** A Response whose body delivers the given text chunks, then ends. */
export function sseResponse(chunks: string[], init: ResponseInit = {}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
    ...init,
  });
}

/**
 * A Response whose body stays open until the request's signal aborts, like a
 * real fetch to a model that is still generating.
 */
export function openStreamResponse(signal: AbortSignal | null | undefined, firstChunk = ''): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (firstChunk) controller.enqueue(encoder.encode(firstChunk));
      signal?.addEventListener('abort', () =>
        controller.error(new DOMException('The operation was aborted.', 'AbortError'))
      );
    },
  });
  return new Response(stream, { status: 200 });
}

export const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
export const delta = (content: string) => sseData({ choices: [{ delta: { content } }] });

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export function mockFetch() {
  const fn = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Let pending microtasks (the async stream loop) run. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
