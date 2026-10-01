import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getInitials } from '../../../utils/avatar';
import { makeChatTitle, MAX_TITLE_LENGTH } from '../../../utils/chatUtils';
import { formatDateForGrouping, groupMessagesByDate } from '../../../utils/timeUtils';
import { buildSystemPrompt } from '../../../utils/systemPrompt';
import type { Message, PersonalizationSettings } from '../../../types';

describe('makeChatTitle', () => {
  it('keeps short messages as they are', () => {
    expect(makeChatTitle('Hello')).toBe('Hello');
    expect(makeChatTitle('x'.repeat(MAX_TITLE_LENGTH))).toBe('x'.repeat(MAX_TITLE_LENGTH));
  });

  it('truncates long messages with an ellipsis', () => {
    const title = makeChatTitle('y'.repeat(MAX_TITLE_LENGTH + 1));
    expect(title).toBe(`${'y'.repeat(MAX_TITLE_LENGTH)}...`);
  });
});

describe('getInitials', () => {
  it.each([
    ['Ada Lovelace', 'AL'],
    ['ada', 'A'],
    ['  grace   brewster  hopper ', 'GH'],
    ['édith piaf', 'ÉP'],
    ['', ''],
    ['   ', ''],
  ])('%j → %j', (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});

describe('date grouping', () => {
  // Wednesday 2024-03-13, 15:00 local time
  const NOW = new Date(2024, 2, 13, 15, 0, 0);
  const at = (days: number, hour = 10) =>
    new Date(2024, 2, 13 + days, hour, 0, 0).getTime();
  const msg = (id: string, timestamp: number): Message => ({ id, role: 'user', content: id, timestamp });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('labels today, yesterday and older dates', () => {
    expect(formatDateForGrouping(at(0))).toBe('Today');
    expect(formatDateForGrouping(at(-1))).toBe('Yesterday');
    expect(formatDateForGrouping(at(-5))).toBe('Mar 8');
  });

  it('groups messages chronologically: older days first, today last', () => {
    const groups = groupMessagesByDate([
      msg('today-1', at(0, 9)),
      msg('old', at(-5)),
      msg('yesterday', at(-1)),
      msg('today-2', at(0, 11)),
      msg('older', at(-9)),
    ]);

    expect(groups.map((g) => g.date)).toEqual(['Mar 4', 'Mar 8', 'Yesterday', 'Today']);
    expect(groups[3].messages.map((m) => m.id)).toEqual(['today-1', 'today-2']);
  });

  it('returns no groups for no messages', () => {
    expect(groupMessagesByDate([])).toEqual([]);
  });
});

describe('buildSystemPrompt', () => {
  const personalization = (over: Partial<PersonalizationSettings> = {}): PersonalizationSettings => ({
    displayName: '',
    customInstructions: '',
    memoriesEnabled: false,
    memories: [],
    ...over,
  });
  const assistant = (systemPrompt: string) => ({
    id: 'a',
    name: 'A',
    avatarEmoji: '🤖',
    systemPrompt,
    createdAt: 0,
    updatedAt: 0,
  });

  it('is null when there is nothing to say', () => {
    expect(buildSystemPrompt(null, personalization())).toBeNull();
    expect(buildSystemPrompt(assistant('   '), personalization({ customInstructions: ' ' }))).toBeNull();
  });

  it('combines assistant, instructions and memories in that order', () => {
    const prompt = buildSystemPrompt(
      assistant('You are a pirate.'),
      personalization({
        customInstructions: 'Be brief.',
        memoriesEnabled: true,
        memories: [
          { id: '1', content: 'Likes tea', createdAt: 0 },
          { id: '2', content: 'Lives in Lima', createdAt: 0 },
        ],
      })
    );
    expect(prompt).toBe(
      [
        'You are a pirate.',
        '## User Instructions\nBe brief.',
        '## What you know about the user\n- Likes tea\n- Lives in Lima',
      ].join('\n\n')
    );
  });

  it('ignores memories while they are disabled', () => {
    const prompt = buildSystemPrompt(
      null,
      personalization({ memories: [{ id: '1', content: 'secret', createdAt: 0 }] })
    );
    expect(prompt).toBeNull();
  });
});
