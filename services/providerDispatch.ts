import type { ProviderKey } from '../hooks/useProvider';
import { streamOpenAICompatible } from './genericStreamService';
import { streamOpenAiResponse } from './openAiService';
import { streamClaudeResponse } from './claudeService';
import type { AppError } from '../types';

export type StreamFn = (
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  systemPrompt?: string
) => () => void;

/**
 * Returns the correct streaming function for the given provider + model.
 * All returned functions share the same (messages, onChunk, onDone, onError, systemPrompt?) → cancel signature.
 */
export function getStreamFn(provider: ProviderKey, model: string): StreamFn {
  switch (provider) {
    case 'llm-llamacpp':
      return (msgs, onChunk, onDone, onError, systemPrompt) =>
        streamOpenAICompatible('/v1', model, msgs, onChunk, onDone, onError, systemPrompt);

    case 'llm-openai':
      return (msgs, onChunk, onDone, onError, systemPrompt) =>
        streamOpenAiResponse(model, msgs, onChunk, onDone, onError, systemPrompt);

    case 'llm-claude':
      return (msgs, onChunk, onDone, onError, systemPrompt) =>
        streamClaudeResponse(model, msgs, onChunk, onDone, onError, systemPrompt);

    case 'llm-ollama':
      return (msgs, onChunk, onDone, onError, systemPrompt) =>
        streamOpenAICompatible('/ollama/v1', model, msgs, onChunk, onDone, onError, systemPrompt);

    default: {
      const _exhaustive: never = provider;
      const err = new Error(`Unknown provider: ${String(_exhaustive)}`) as AppError;
      err.code = 'UNKNOWN';
      err.userFacing = true;
      err.userMessage = `Provider "${String(_exhaustive)}" is not configured. Check your model settings.`;
      err.retryable = false;
      return (_msgs, _chunk, _done, onError) => { onError(err); return () => {}; };
    }
  }
}
