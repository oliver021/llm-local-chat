import { describe, it, expect } from 'vitest';
import { makeChatTitle, MAX_TITLE_LENGTH } from '../../utils/chatUtils';

describe('makeChatTitle', () => {
  it('returns the content unchanged when within the limit', () => {
    expect(makeChatTitle('Short message')).toBe('Short message');
  });

  it('returns content unchanged when exactly at the limit', () => {
    const exact = 'a'.repeat(MAX_TITLE_LENGTH);
    expect(makeChatTitle(exact)).toBe(exact);
  });

  it('truncates and appends "..." when content exceeds the limit', () => {
    const long = 'a'.repeat(MAX_TITLE_LENGTH + 10);
    const result = makeChatTitle(long);
    expect(result).toBe('a'.repeat(MAX_TITLE_LENGTH) + '...');
  });

  it('handles empty string without throwing', () => {
    expect(makeChatTitle('')).toBe('');
  });

  it('truncates a realistic sentence', () => {
    const msg = 'What is the best way to learn TypeScript?';
    const result = makeChatTitle(msg);
    expect(result.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH + 3); // +3 for "..."
    expect(result.endsWith('...')).toBe(true);
  });
});
