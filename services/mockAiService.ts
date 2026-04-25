/**
 * Mock AI Service — streaming edition
 *
 * Simulates a real LLM API that streams tokens progressively.
 * Responses include markdown (bold, code blocks, lists, tables, blockquotes)
 * so the markdown renderer in MessageBubble is always exercised.
 *
 * PERFORMANCE NOTE:
 * We use a fixed setInterval (TICK_MS) and flush a small chunk of words on
 * each tick. This bounds React to ~25 re-renders/second regardless of response
 * length, preventing the "hundreds of setState calls" problem that occurs when
 * firing one setState per token.
 *
 * Replace streamMockAiResponse with your real SSE / fetch-stream call when
 * connecting a backend. The onChunk / onDone signature is backend-agnostic.
 */

const TICK_MS = 40;        // flush interval (ms) — 25 fps feels natural
const WORDS_PER_TICK = 3;  // words emitted per tick

const STREAMING_RESPONSES = [
  `Great question! Here's a concise breakdown:

**Core concepts to keep in mind:**

- **Clarity** — write code that reads like prose
- **Consistency** — follow the same patterns throughout
- *Avoid premature optimisation* — make it work first

\`\`\`typescript
// A clean, self-documenting function
function calculateTotal(items: Item[]): number {
  return items
    .filter(item => item.isActive)
    .reduce((sum, item) => sum + item.price, 0);
}
\`\`\`

This approach gives you **readability** without sacrificing performance.`,

  `Here's what I'd recommend based on current best practices:

1. **Start simple** — don't over-engineer the first version
2. **Add tests early** — they're cheaper to write now than later
3. **Iterate quickly** — ship small, learn fast

\`\`\`python
def greet(name: str) -> str:
    """Return a personalised greeting."""
    return f"Hello, {name}! Welcome aboard."

print(greet("Aura"))
\`\`\`

> "Make it work, make it right, make it fast." — Kent Beck`,

  `Sure! Let me walk you through it step by step.

### How it works

When a user sends a message, the following happens:

1. The input is *tokenised* and sent to the model
2. The model generates a response **token by token**
3. Each token is streamed back to the client in real time

\`\`\`bash
# Example API call using curl
curl -X POST https://api.example.com/chat \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '{"message": "Hello world"}'
\`\`\`

This is why you see responses appear *gradually* rather than all at once.`,

  `I can certainly help with that! Here's a concise answer:

The key insight is that **composition beats inheritance** in most modern codebases.

\`\`\`javascript
// Prefer this (composition)
const withLogging = (fn) => (...args) => {
  console.log('Calling with:', args);
  return fn(...args);
};

const loggedFetch = withLogging(fetch);
\`\`\`

vs tightly-coupled class hierarchies that become hard to change.

*Does that address what you were asking about?*`,

  `Absolutely! Let me clarify the difference:

| Approach | Pros | Cons |
|---|---|---|
| **REST** | Simple, cacheable | Over/under-fetching |
| **GraphQL** | Precise queries | Complex setup |
| **tRPC** | End-to-end types | TypeScript only |

For most projects starting out, **REST** is the right choice — you can always migrate later once you understand your data requirements better.`,
];

/**
 * Stream a mock AI response in fixed-rate chunks.
 *
 * @param onChunk   Called with a batch of text on every tick
 * @param onDone    Called once the entire response has been delivered
 * @returns         Cancel function — call to abort mid-stream
 */
export function streamMockAiResponse(
  onChunk: (chunk: string) => void,
  onDone: () => void
): () => void {
  const fullText = STREAMING_RESPONSES[Math.floor(Math.random() * STREAMING_RESPONSES.length)];

  // Split preserving whitespace so markdown spacing is retained
  const words = fullText.split(/(\s+)/);
  let index = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Small initial delay simulates network round-trip latency
  const startDelay = 350 + Math.random() * 300;

  const startTimeout = setTimeout(() => {
    intervalId = setInterval(() => {
      if (index >= words.length) {
        clearInterval(intervalId!);
        onDone();
        return;
      }

      // Collect the next WORDS_PER_TICK words into a single chunk
      const chunk = words.slice(index, index + WORDS_PER_TICK).join('');
      index += WORDS_PER_TICK;
      onChunk(chunk);
    }, TICK_MS);
  }, startDelay);

  return () => {
    clearTimeout(startTimeout);
    if (intervalId !== null) clearInterval(intervalId);
  };
}
