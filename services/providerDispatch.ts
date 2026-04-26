import type { ProviderKey } from '../hooks/useProvider';
import { streamOpenAICompatible } from './genericStreamService';
import { streamOpenAiResponse } from './openAiService';
import { streamClaudeResponse } from './claudeService';

export type StreamFn = (
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
) => () => void;

/**
 * Returns the correct streaming function for the given provider + model.
 * All returned functions share the same (messages, onChunk, onDone, onError) → cancel signature.
 */
export function getStreamFn(provider: ProviderKey, model: string): StreamFn {
  switch (provider) {
    case 'llm-llamacpp':
      return (msgs, onChunk, onDone, onError) =>
        streamOpenAICompatible('/v1', model, msgs, onChunk, onDone, onError);

    case 'llm-openai':
      return (msgs, onChunk, onDone, onError) =>
        streamOpenAiResponse(model, msgs, onChunk, onDone, onError);

    case 'llm-claude':
      return (msgs, onChunk, onDone, onError) =>
        streamClaudeResponse(model, msgs, onChunk, onDone, onError);

    case 'llm-ollama':
      return (msgs, onChunk, onDone, onError) =>
        streamOpenAICompatible('/ollama/v1', model, msgs, onChunk, onDone, onError);
  }
}
