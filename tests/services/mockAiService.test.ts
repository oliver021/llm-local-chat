import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamMockAiResponse } from '../../services/mockAiService';

describe('streamMockAiResponse', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('calls onChunk at least once and then calls onDone', async () => {
    const onChunk = vi.fn();
    const onDone = vi.fn();

    streamMockAiResponse(onChunk, onDone);

    // Advance past the initial network-latency delay + full stream duration
    await vi.runAllTimersAsync();

    expect(onChunk).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('passes non-empty string chunks to onChunk', async () => {
    const chunks: string[] = [];
    const onDone = vi.fn();

    streamMockAiResponse((chunk) => chunks.push(chunk), onDone);
    await vi.runAllTimersAsync();

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach(c => expect(typeof c).toBe('string'));
  });

  it('assembles chunks into a non-empty response', async () => {
    let assembled = '';
    const onDone = vi.fn();

    streamMockAiResponse((chunk) => { assembled += chunk; }, onDone);
    await vi.runAllTimersAsync();

    expect(assembled.trim().length).toBeGreaterThan(0);
  });

  it('cancel() prevents onDone from being called', async () => {
    const onChunk = vi.fn();
    const onDone = vi.fn();

    const cancel = streamMockAiResponse(onChunk, onDone);
    cancel(); // cancel immediately, before any timers fire

    await vi.runAllTimersAsync();

    expect(onDone).not.toHaveBeenCalled();
  });

  it('cancel() stops further onChunk calls', async () => {
    const onChunk = vi.fn();
    const onDone = vi.fn();

    const cancel = streamMockAiResponse(onChunk, onDone);

    // Advance past initial delay so streaming has started
    await vi.advanceTimersByTimeAsync(700);
    const countAfterStart = onChunk.mock.calls.length;

    cancel();

    // Advance more — no additional calls should happen
    await vi.advanceTimersByTimeAsync(5000);
    expect(onChunk.mock.calls.length).toBe(countAfterStart);
  });

  it('returns a function (the cancel handle)', () => {
    const cancel = streamMockAiResponse(vi.fn(), vi.fn());
    expect(typeof cancel).toBe('function');
    cancel(); // cleanup
  });
});
