import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/genericStreamService', () => ({
  streamOpenAICompatible: vi.fn(() => () => {}),
}));
vi.mock('../../../services/openAiService', () => ({ streamOpenAiResponse: vi.fn(() => () => {}) }));
vi.mock('../../../services/claudeService', () => ({ streamClaudeResponse: vi.fn(() => () => {}) }));

import { getStreamFn } from '../../../services/providerDispatch';
import { streamOpenAICompatible } from '../../../services/genericStreamService';
import { streamOpenAiResponse } from '../../../services/openAiService';
import { streamClaudeResponse } from '../../../services/claudeService';
import type { ProviderKey } from '../../../hooks/useProvider';

const messages = [{ role: 'user' as const, content: 'hi' }];
const noop = () => {};

beforeEach(() => vi.clearAllMocks());

describe('getStreamFn', () => {
  it('sends llama.cpp traffic to /v1 on our server', () => {
    getStreamFn('llm-llamacpp', 'model.gguf')(messages, noop, noop, noop, 'sys');
    expect(streamOpenAICompatible).toHaveBeenCalledWith('/v1', 'model.gguf', messages, noop, noop, noop, 'sys');
  });

  it('sends Ollama traffic to /ollama/v1', () => {
    getStreamFn('llm-ollama', 'llama3.2')(messages, noop, noop, noop);
    expect(streamOpenAICompatible).toHaveBeenCalledWith('/ollama/v1', 'llama3.2', messages, noop, noop, noop, undefined);
  });

  it('uses the OpenAI and Anthropic SDK services for the cloud providers', () => {
    getStreamFn('llm-openai', 'gpt-4o')(messages, noop, noop, noop, 'sys');
    expect(streamOpenAiResponse).toHaveBeenCalledWith('gpt-4o', messages, noop, noop, noop, 'sys');

    getStreamFn('llm-claude', 'claude-x')(messages, noop, noop, noop);
    expect(streamClaudeResponse).toHaveBeenCalledWith('claude-x', messages, noop, noop, noop, undefined);
  });

  it('returns the cancel function of the underlying stream', () => {
    const cancel = vi.fn();
    vi.mocked(streamOpenAICompatible).mockReturnValueOnce(cancel);
    expect(getStreamFn('llm-llamacpp', 'm')(messages, noop, noop, noop)).toBe(cancel);
  });

  it('reports an unknown provider through onError instead of throwing', () => {
    const onError = vi.fn();
    const cancel = getStreamFn('llm-nope' as ProviderKey, 'm')(messages, noop, noop, onError);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].userMessage).toMatch(/not configured/);
    expect(() => cancel()).not.toThrow();
  });
});
