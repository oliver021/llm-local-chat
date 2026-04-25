import { describe, it, expect, beforeAll } from 'vitest';
import { formatTime, formatDateForGrouping, groupMessagesByDate } from '../../utils/timeUtils';
import type { Message } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'hello',
    timestamp: Date.now(),
    ...overrides,
  };
}

function daysAgo(n: number): number {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0); // noon — avoids midnight edge cases
  return d.getTime();
}

// ── formatTime ────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('returns a non-empty string', () => {
    expect(formatTime(Date.now())).toBeTruthy();
  });

  it('includes AM or PM', () => {
    const result = formatTime(Date.now());
    expect(result).toMatch(/AM|PM/i);
  });

  it('formats a known timestamp consistently', () => {
    // 2024-01-15 14:30:00 UTC → locale-dependent, but must have "2:30"
    const ts = new Date('2024-01-15T14:30:00').getTime();
    const result = formatTime(ts);
    expect(result).toMatch(/2:30/);
  });
});

// ── formatDateForGrouping ─────────────────────────────────────────────────────

describe('formatDateForGrouping', () => {
  it('returns "Today" for a timestamp from today', () => {
    expect(formatDateForGrouping(Date.now())).toBe('Today');
  });

  it('returns "Yesterday" for a timestamp from yesterday', () => {
    expect(formatDateForGrouping(daysAgo(1))).toBe('Yesterday');
  });

  it('returns a formatted date string for older timestamps', () => {
    const result = formatDateForGrouping(daysAgo(10));
    // Should be something like "Apr 14" — not "Today" or "Yesterday"
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Yesterday');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── groupMessagesByDate ───────────────────────────────────────────────────────

describe('groupMessagesByDate', () => {
  it('returns an empty array for no messages', () => {
    expect(groupMessagesByDate([])).toEqual([]);
  });

  it('groups messages with the same date together', () => {
    const now = Date.now();
    const messages = [
      makeMessage({ id: '1', timestamp: now }),
      makeMessage({ id: '2', timestamp: now + 1000 }),
    ];
    const groups = groupMessagesByDate(messages);
    expect(groups).toHaveLength(1);
    expect(groups[0].date).toBe('Today');
    expect(groups[0].messages).toHaveLength(2);
  });

  it('creates separate groups for different dates', () => {
    const messages = [
      makeMessage({ id: '1', timestamp: daysAgo(5) }),
      makeMessage({ id: '2', timestamp: daysAgo(1) }),
      makeMessage({ id: '3', timestamp: Date.now() }),
    ];
    const groups = groupMessagesByDate(messages);
    expect(groups).toHaveLength(3);
  });

  it('places "Today" as the last group (bottom of the chat)', () => {
    const messages = [
      makeMessage({ id: '1', timestamp: daysAgo(5) }),
      makeMessage({ id: '2', timestamp: Date.now() }),
    ];
    const groups = groupMessagesByDate(messages);
    expect(groups[groups.length - 1].date).toBe('Today');
  });

  it('places older dates before newer ones', () => {
    const messages = [
      makeMessage({ id: '1', timestamp: daysAgo(10) }),
      makeMessage({ id: '2', timestamp: daysAgo(5) }),
      makeMessage({ id: '3', timestamp: daysAgo(1) }),
      makeMessage({ id: '4', timestamp: Date.now() }),
    ];
    const groups = groupMessagesByDate(messages);
    const dates = groups.map(g => g.date);
    // "Today" must be last
    expect(dates[dates.length - 1]).toBe('Today');
    // "Yesterday" must be second-to-last
    expect(dates[dates.length - 2]).toBe('Yesterday');
  });

  it('preserves message order within each group', () => {
    const t1 = Date.now() - 5000;
    const t2 = Date.now();
    const messages = [
      makeMessage({ id: 'first', timestamp: t1 }),
      makeMessage({ id: 'second', timestamp: t2 }),
    ];
    const groups = groupMessagesByDate(messages);
    expect(groups[0].messages[0].id).toBe('first');
    expect(groups[0].messages[1].id).toBe('second');
  });
});
