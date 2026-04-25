# Connecting Aura to a Real Backend

> **Audience:** AI agents and developers performing backend integration.  
> This document maps every integration point in the codebase — the exact files, functions, types, and data contracts an agent needs to understand before making changes.

---

## Mental Model

The template is split into three clear zones:

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer          components/, context/, hooks/useUIState  │
│  (never touch for backend integration)                      │
├─────────────────────────────────────────────────────────────┤
│  State Layer       hooks/useChats.ts                        │
│  (orchestrates streaming, handles cancel, mutates state)    │
├─────────────────────────────────────────────────────────────┤
│  Service Layer     services/mockAiService.ts  ← REPLACE     │
│  (the only file that talks to the network)                  │
└─────────────────────────────────────────────────────────────┘
```

**Primary integration target:** `services/mockAiService.ts`  
**Secondary integration point:** `hooks/useChats.ts` (for conversation history, auth headers, error handling)

---

## 1. Primary Integration Point — `services/mockAiService.ts`

**File:** `services/mockAiService.ts`  
**Purpose:** The only file that generates AI responses. Replace the mock with a real network call.

### Current Signature (must be preserved)

```typescript
export function streamMockAiResponse(
  onChunk: (chunk: string) => void,   // called for each text fragment received
  onDone: () => void                  // called exactly once when stream ends
): () => void                         // MUST return a cancel/cleanup function
```

### Contract Requirements

| Requirement | Detail |
|---|---|
| `onChunk` call frequency | Any rate — the UI batches internally at 25fps |
| `onChunk` argument | Raw text string (can be a single token or multiple words) |
| `onDone` must be called | Exactly once, after the final chunk, never before |
| Return value | A `() => void` cancel function — called when user switches chat |
| Errors | Must NOT call `onChunk` or `onDone` after cancel is invoked |

### Implementation Templates

#### OpenAI (streaming)
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY, dangerouslyAllowBrowser: true });

export function streamMockAiResponse(
  onChunk: (chunk: string) => void,
  onDone: () => void
): () => void {
  let cancelled = false;

  (async () => {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [{ role: 'user', content: 'Hello' }], // see §2 for passing history
    });

    for await (const chunk of stream) {
      if (cancelled) break;
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) onChunk(text);
    }

    if (!cancelled) onDone();
  })();

  return () => { cancelled = true; };
}
```

#### Anthropic Claude (streaming)
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true });

export function streamMockAiResponse(
  onChunk: (chunk: string) => void,
  onDone: () => void
): () => void {
  let cancelled = false;

  (async () => {
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello' }],
    });

    stream.on('text', (text) => {
      if (!cancelled) onChunk(text);
    });

    await stream.finalMessage();
    if (!cancelled) onDone();
  })();

  return () => { cancelled = true; };
}
```

#### Custom API (SSE / fetch stream)
```typescript
export function streamMockAiResponse(
  onChunk: (chunk: string) => void,
  onDone: () => void
): () => void {
  const controller = new AbortController();

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello' }),
    signal: controller.signal,
  }).then(async (res) => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value));
    }

    onDone();
  }).catch((err) => {
    if (err.name !== 'AbortError') console.error(err);
  });

  return () => controller.abort();
}
```

---

## 2. Secondary Integration Point — `hooks/useChats.ts`

**File:** `hooks/useChats.ts`  
**Purpose:** Owns all chat state, orchestrates when the service is called, and handles the streaming lifecycle. Modify this file when you need to pass conversation history, authentication tokens, or handle API errors.

### Where `streamMockAiResponse` Is Called

There are **two call sites** inside `useChats.ts`:

#### Call Site 1 — `handleSendMessage` (line ~161)
```typescript
// hooks/useChats.ts, inside handleSendMessage()
const cancel = streamMockAiResponse(
  (token) => { /* appends token to message.content */ },
  ()      => { /* marks isStreaming: false, persists */ }
);
cancelStreamRef.current = cancel;
```

**To pass conversation history here**, access `chats` state and build the message array before the call:
```typescript
// Find the current chat's message history
const currentChat = chats.find(c => c.id === currentChatId);
const history = currentChat?.messages.map(m => ({
  role: m.role === 'ai' ? 'assistant' : 'user',
  content: m.content,
})) ?? [];

// Pass to your real service:
const cancel = streamRealAiResponse(history, content, onChunk, onDone);
```

#### Call Site 2 — `handleRegenerateMessage` (line ~289)
```typescript
// Same pattern, no user message — re-generates last AI response
const cancel = streamMockAiResponse(onChunk, onDone);
```

For regeneration, you would pass history **up to but not including** the deleted AI message.

### The Streaming Lifecycle (critical to understand)

```
handleSendMessage called
  │
  ├─ 1. Cancel any running stream (cancelStreamRef.current?.())
  ├─ 2. Add user Message to state
  ├─ 3. setIsTyping(true)   ← shows TypingIndicator
  │
  ├─ setTimeout(380ms) ──► Add placeholder AI Message { isStreaming: true, content: '' }
  │                         setIsTyping(false)
  │
  └─ streamMockAiResponse(onChunk, onDone)
       │
       ├─ onChunk(token)  ── appends token to placeholder message.content (per tick)
       │
       └─ onDone()        ── sets isStreaming: false on the AI message
```

**Key state field:** `Message.isStreaming` — drives the blinking cursor in `MessageBubble` and hides action buttons during streaming.

### Cancel Ref Pattern

```typescript
// hooks/useChats.ts (line ~33)
const cancelStreamRef = useRef<(() => void) | null>(null);
```

The cancel function is stored here and invoked:
- When user clicks a different chat (`handleSelectChat`)
- When user starts a new chat (`handleNewChat`)
- When user regenerates a message (`handleRegenerateMessage`)
- On component unmount

Your backend implementation's cancel function **must** stop all `onChunk` calls immediately.

---

## 3. Data Types — `types.ts`

**File:** `types.ts`

These are the shapes flowing through the entire UI. Understanding them prevents type errors during integration.

```typescript
interface Message {
  id: string;           // Unique ID — format: "msg-${Date.now()}" or "msg-ai-${Date.now()}"
  role: 'user' | 'ai'; // NOTE: 'ai' not 'assistant' — map your API role before storing
  content: string;      // Accumulated text; appended to during streaming
  timestamp: number;    // Unix ms — Date.now() at creation
  isStreaming?: boolean; // true while tokens are arriving; false or undefined when done
  isEdited?: boolean;   // Set to true by handleEditMessage
  editedAt?: number;    // Timestamp of last edit
}

interface ChatSession {
  id: string;           // Unique ID — format: "chat-${Date.now()}"
  title: string;        // Auto-set from first user message (first 30 chars)
  isPinned: boolean;    // Drives sidebar "PINNED" section
  updatedAt: number;    // Updated on every new message or edit
  messages: Message[];  // Full ordered history, oldest first
}
```

**Role mapping note:** The UI uses `'ai'` as the role string, not `'assistant'`. When building a history array to pass to OpenAI/Anthropic, remap:
```typescript
role: message.role === 'ai' ? 'assistant' : 'user'
```

---

## 4. Context Layer — `context/ChatContext.tsx`

**File:** `context/ChatContext.tsx`  
**Purpose:** Distributes action handlers to all components without prop drilling. Defines the public action API.

```typescript
interface ChatActionsContextValue {
  handleSendMessage: (content: string) => void;
  handleNewChat: () => void;
  handleSelectChat: (id: string) => void;
  handleTogglePin: (id: string) => void;
  openSettings: () => void;
  handleCopyMessage: (messageId: string) => void;
  handleDeleteMessage: (chatId: string, messageId: string) => void;
  handleEditMessage: (chatId: string, messageId: string, newContent: string) => void;
  handleRegenerateMessage: (chatId: string, messageId: string) => void;
}
```

**Agent note:** You do not need to touch this file for backend integration. All real logic lives in `useChats.ts`. This context is just the delivery mechanism.

---

## 5. Persistence Layer — `utils/storage.ts`

**File:** `utils/storage.ts`  
**Purpose:** Reads and writes to `localStorage`. All chat history is persisted here between sessions.

```typescript
// Storage keys
'AURA_CHATS'    // ChatSession[] — full chat history
'AURA_THEME'    // 'light' | 'dark'
'AURA_UI_STATE' // { sidebarOpen: boolean, settingsOpen: boolean }
```

**Integration note:** If your backend stores conversation history server-side, you may want to:
1. Replace `getStoredChats` to fetch from your API on initial load
2. Replace `setStoredChats` (called in `useChats.ts` via `useEffect` on every state change) to sync to your server
3. Or disable localStorage sync entirely and rely solely on the server

The `useEffect` that triggers the sync lives at **`hooks/useChats.ts` line ~36**:
```typescript
useEffect(() => {
  setStoredChats(chats);  // ← swap this for your API call
}, [chats]);
```

---

## 6. Environment Variables

For browser-side API calls, use Vite's env system:

```bash
# .env.local  (never commit this file)
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_API_BASE_URL=https://your-backend.com
```

Access in code:
```typescript
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
```

**Security note:** Browser-side API keys are visible to users. For production, proxy requests through your own backend server and keep keys server-side only.

---

## 7. Error Handling — What's Missing and Where to Add It

The current mock never fails. A real backend needs error states wired in.

### Recommended additions in `hooks/useChats.ts`

```typescript
// Inside handleSendMessage, in the onDone callback replacement:
const cancel = streamRealAiResponse(
  (token) => { /* append token */ },
  () => {
    // Stream complete — existing logic
    setChats(prev => /* mark isStreaming false */);
    cancelStreamRef.current = null;
  },
  (error) => {
    // ← ADD THIS error callback
    setIsTyping(false);
    setChats(prev => prev.map(chat => {
      if (chat.id !== currentChatId) return chat;
      return {
        ...chat,
        messages: chat.messages.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, content: 'Something went wrong. Please try again.', isStreaming: false }
            : msg
        ),
      };
    }));
    toast.error('Failed to get a response');
    cancelStreamRef.current = null;
  }
);
```

You'll need to update the `streamMockAiResponse` signature to accept an optional `onError` third argument and update the function body to call it on catch.

---

## 8. Integration Checklist

Work through these in order:

- [ ] **Create `.env.local`** with your API key(s)
- [ ] **Replace `streamMockAiResponse`** in `services/mockAiService.ts` with a real streaming call
- [ ] **Verify the cancel function** works — switch chats mid-stream and confirm no orphaned state updates
- [ ] **Pass conversation history** — update the call site in `handleSendMessage` to include prior messages
- [ ] **Map roles** — convert `'ai'` → `'assistant'` when building history for OpenAI/Anthropic
- [ ] **Add error handling** — wire an `onError` path in `handleSendMessage`
- [ ] **Decide on persistence** — keep localStorage, replace with server sync, or both
- [ ] **Move API keys server-side** — proxy requests through `/api/chat` to keep keys out of the browser

---

## 9. File Map at a Glance

```
services/
  mockAiService.ts        ← PRIMARY: replace this file's internals

hooks/
  useChats.ts             ← SECONDARY: pass history, add error handling, swap storage sync

types.ts                  ← READ ONLY: understand Message and ChatSession shapes

utils/
  storage.ts              ← OPTIONAL: replace localStorage with server sync

context/
  ChatContext.tsx          ← DO NOT TOUCH: just the action delivery mechanism

components/
  MessageBubble.tsx        ← DO NOT TOUCH: reads message.isStreaming and message.content
  MessageActionMenu.tsx    ← DO NOT TOUCH: triggers handleCopy/Delete/Regenerate
```

---

## 10. Minimal End-to-End Checklist for an Agent

When performing this integration autonomously, validate each step:

1. **`streamMockAiResponse` replaced** — function signature unchanged, real network call inside
2. **`onChunk` fires** — at least one call with non-empty string during a response
3. **`onDone` fires** — called exactly once after stream ends, `isStreaming` becomes `false`
4. **Cancel works** — send a message, immediately switch chat, confirm no further `setChats` mutations
5. **Build passes** — `npm run build` exits 0 with no TypeScript errors
6. **History included** — second message in a conversation receives prior context
7. **Errors handled** — network failure shows error message in bubble, not a blank message
