import { streamOpenAICompatible } from './genericStreamService';

/**
 * Ollama streaming — uses the OpenAI-compatible /v1/chat/completions endpoint.
 * The Vite proxy rewrites /ollama/* → http://localhost:11434/*
 * nginx in Docker also proxies /ollama → the ollama service.
 */
export function streamOllamaResponse(
  model: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): () => void {
  return streamOpenAICompatible('/ollama/v1', model, messages, onChunk, onDone, onError);
}
