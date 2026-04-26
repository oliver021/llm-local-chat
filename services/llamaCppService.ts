import { streamOpenAICompatible } from './genericStreamService';

/**
 * llama.cpp / llama-server streaming.
 * Thin wrapper over the generic OpenAI-compatible service.
 * The Vite proxy rewrites /v1/* → http://localhost:8080/*
 * nginx in Docker also proxies /v1 → the llama-server service.
 *
 * The `model` parameter is passed through to the request body.
 * llama-server ignores the model field (it serves whatever is loaded),
 * but we include it for API compatibility.
 */
export function streamLlamaCppResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  model = 'local'
): () => void {
  return streamOpenAICompatible('/v1', model, messages, onChunk, onDone, onError);
}
