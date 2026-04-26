# llm-local-chat — Implementation Roadmap

> **How to read this document**  
> Each section describes a discrete deliverable: what it means, what files to touch, exactly how to implement it, and how to verify it works. Cross-references to [`connecting.md`](./connecting.md) point to the data-contract details an agent or developer needs before writing code.

---

## Current Status — What Works Today

The project ships as a complete, production-quality **UI shell** backed by a mock AI service. Everything listed here works without any backend:

| Area | Status | Details |
|---|---|---|
| Chat send / receive (mock) | ✅ Working | `services/mockAiService.ts` streams fake markdown responses |
| Streaming cursor + typing indicator | ✅ Working | `Message.isStreaming` drives blinking cursor in `MessageBubble` |
| Markdown rendering | ✅ Working | `react-markdown` + `react-syntax-highlighter` in all AI bubbles |
| Copy / delete / edit / regenerate | ✅ Working | All message actions wired in `hooks/useChats.ts` |
| Chat history (localStorage) | ✅ Working | `utils/storage.ts` persists `ChatSession[]` across reloads |
| Sidebar (pinned / recent, new chat) | ✅ Working | Fully interactive; pin state persisted |
| Light / dark theme | ✅ Working | `hooks/useTheme.ts` + localStorage persistence |
| Compact mode toggle | ✅ Working | `useUIState.ts` + localStorage; `MessageBubble` reads it |
| Keyboard shortcuts | ✅ Working | `⌘K` new chat · `⌘⇧S` sidebar · `/` focus input |
| Settings modal | ✅ Working | Account / Appearance / Privacy tabs rendered |
| Error boundary | ✅ Working | Chat area isolated; sidebar and settings survive crashes |
| Toast notifications | ✅ Working | `sonner` for all mutations (copy, delete, edit, error) |
| Auto-scroll | ✅ Working | Scrolls to bottom on each new token during streaming |
| Character counter + input limit | ✅ Working | 4 000-char cap with warning at 3 500 |
| Unit tests (Vitest) | ✅ Working | `tests/` — mockAiService, chatUtils, storage, timeUtils |
| E2E tests (Playwright) | ✅ Working | `e2e/` — chat, layout, settings, sidebar, theme flows |
| Docker packaging | ✅ Created | `Dockerfile` + `docker-compose.yml` + `nginx.conf` |
| llama.cpp SSE service | ✅ Created | `services/llamaCppService.ts` — needs live server to test |

### What is UI-only / placeholder today

These features render but have no real logic behind them:

| Feature | Location | Issue |
|---|---|---|
| Account profile ("Alex Developer") | `components/Settings.tsx` | Hardcoded; no auth system |
| "Edit Profile" / "Manage Billing" | `components/Settings.tsx` | Buttons with no handlers |
| Theme picker (System / Light / Dark) | `components/Settings.tsx` | Decorative; real toggle is in TopNav |
| "Data Collection" / "Chat History" toggles | `components/Settings.tsx` | Persisted but never enforced |
| Attach file button (paperclip `+`) | `components/ChatInput.tsx` | No handler; visual only |
| "Aura Pro" badge | `components/Settings.tsx` | Hardcoded string |
| User avatar | `components/MessageBubble.tsx` | `picsum.photos` placeholder |
| Model / provider selector | — | Not built yet |
| System prompt | — | Not built yet |
| Stop-generation button | — | Cancel fn exists in code; no UI button |

---

## Integration Architecture (Read First)

Before any phase below, read [`connecting.md`](./connecting.md). The three-zone model:

```
┌──────────────────────────────────────────────────────────────┐
│  UI Layer      components/ · context/ · hooks/useUIState     │
│  Never touch for backend integration                         │
├──────────────────────────────────────────────────────────────┤
│  State Layer   hooks/useChats.ts                             │
│  Orchestrates streaming · cancel · state mutations           │
├──────────────────────────────────────────────────────────────┤
│  Service Layer services/<provider>Service.ts   ← REPLACE     │
│  Only file that talks to the network                         │
└──────────────────────────────────────────────────────────────┘
```

**Two integration points — every provider touches exactly these:**

1. **`services/<provider>Service.ts`** — create one file per provider (see `connecting.md §1`)
2. **`hooks/useChats.ts`** — two call sites: `handleSendMessage` (~line 153) and `handleRegenerateMessage` (~line 260) (see `connecting.md §2`)

**Data contract that must never break** (see `connecting.md §3`):
```ts
// Service function signature — same shape for every provider
function streamXxxResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone:  () => void,
  onError: (err: Error) => void
): () => void   // ← cancel function; MUST stop onChunk immediately when called
```

**Role mapping** — always remap before building history arrays:
```ts
role: m.role === 'ai' ? 'assistant' : 'user'
```

---

## Phase 1 — llama.cpp (Docker) ← **Current Priority**

**Goal:** Users run `docker compose up`, place a GGUF model in `./models/`, open `http://localhost:3000`, and have a working local LLM chat with no install steps.

**Status:** Service layer written. Docker files created. Needs a live llama-server to test end-to-end.

### Files involved

| File | Action |
|---|---|
| `services/llamaCppService.ts` | ✅ Created |
| `hooks/useChats.ts` | ✅ Modified (history + onError at both call sites) |
| `vite.config.ts` | ✅ Modified (`/v1` → `localhost:8080`) |
| `nginx.conf` | ✅ Created (`proxy_buffering off` for SSE) |
| `Dockerfile` | ✅ Created (multi-stage node → nginx) |
| `docker-compose.yml` | ✅ Created |
| `.dockerignore` | ✅ Created |
| `.env.example` | ✅ Updated |

### How the service works

`services/llamaCppService.ts` calls `POST /v1/chat/completions` (llama-server's OpenAI-compatible endpoint) with `stream: true`. The response body is a Server-Sent Events stream. A line-buffer accumulates partial lines across network chunks, strips `data:` prefixes, guards against the `[DONE]` sentinel before `JSON.parse`, and extracts `choices[0].delta.content`. `AbortController` provides the cancel function.

See [`connecting.md §1`](./connecting.md#1-primary-integration-point--servicesmockaiservicets) for the full contract and gotcha list.

### Dev workflow (no Docker)

```bash
# Terminal 1 — run llama-server
./llama-server -m ./models/model.gguf --host 0.0.0.0 --port 8080

# Terminal 2 — run Vite dev server
npm run dev
# Open http://localhost:5173
# Vite proxy forwards /v1/* → localhost:8080, handles CORS
```

### Docker workflow

```bash
# Place your GGUF model
cp ~/Downloads/your-model.gguf ./models/model.gguf

# Build and start
docker compose up --build
# Open http://localhost:3000
```

To use a differently-named model file without renaming it:
```bash
MODEL_FILE=mistral-7b-q4_k_m.gguf docker compose up
```

### Verification checklist

- [ ] Send a message → tokens appear progressively (SSE streaming works)
- [ ] Switch chat mid-stream → old response stops (cancel/AbortController works)
- [ ] Kill llama-server, send message → error bubble appears, no blank message
- [ ] Second message in a conversation includes prior messages as context
- [ ] `docker compose up --build` exits successfully; `http://localhost:3000` serves the UI
- [ ] `curl http://localhost:8080/v1/models` → llama-server responds (health check)
- [ ] `npm run type-check` exits 0

### Known llama-server quirks

| Issue | Cause | Fix |
|---|---|---|
| Tokens don't stream in browser | nginx missing `proxy_buffering off` | Already in `nginx.conf` |
| 400 from llama-server in dev | Missing `changeOrigin: true` in Vite proxy | Already in `vite.config.ts` |
| `[DONE]` triggers JSON parse error | Not checking sentinel before parse | Already handled in service |
| First delta has no content | Role-only event — `delta.content` is undefined | `?? ''` guard in place |
| Container can't reach llama-server | Server bound to loopback | `--host 0.0.0.0` in compose command |

---

## Phase 2 — OpenAI

**Goal:** Add an OpenAI streaming service so the app can run against `gpt-4o` (and other models) without Docker or local hardware.

### Files to create / modify

| File | Action |
|---|---|
| `services/openAiService.ts` | **Create** |
| `hooks/useChats.ts` | **Modify** — swap import at both call sites |
| `vite.config.ts` | **Modify** — update proxy to `api.openai.com` OR remove proxy (server-side key) |
| `.env.example` | **Verify** — `VITE_OPENAI_API_KEY` already documented |

### Implementation: `services/openAiService.ts`

Install the SDK: `npm install openai`

```ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,  // remove when proxying server-side
});

export function streamOpenAiResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone:  () => void,
  onError: (err: Error) => void
): () => void {
  let cancelled = false;

  (async () => {
    try {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        stream: true,
        messages,
      });

      for await (const chunk of stream) {
        if (cancelled) break;
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) onChunk(text);
      }

      if (!cancelled) onDone();
    } catch (err) {
      if (!cancelled) onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => { cancelled = true; };
}
```

See [`connecting.md §1 — OpenAI template`](./connecting.md#openai-streaming).

### How to switch providers in `hooks/useChats.ts`

In both call sites (lines ~163 and ~260), change the import and function name:
```ts
// Before (llama.cpp)
import { streamLlamaCppResponse } from '../services/llamaCppService';
// After (OpenAI)
import { streamOpenAiResponse } from '../services/openAiService';
```

The rest of the call site — history building, role mapping, `onChunk`, `onDone`, `onError` — stays identical. This is the single-seam design from `connecting.md`.

### Security note

`dangerouslyAllowBrowser: true` exposes your API key to anyone who opens DevTools. For a template/demo this is acceptable. For any real deployment, remove that flag and proxy all requests through a backend server. See [`connecting.md §8`](./connecting.md#8-integration-checklist).

### Verification checklist

- [ ] `npm install openai` and `npm run type-check` exit 0
- [ ] Create `.env.local` with `VITE_OPENAI_API_KEY=sk-...`
- [ ] Send a message → GPT-4o response streams in
- [ ] Regenerate → correct conversation history passed
- [ ] Rate-limit error (429) → error bubble shows, not blank message

---

## Phase 3 — Anthropic Claude

**Goal:** Add Claude streaming so the app can run against `claude-sonnet-4-6` or `claude-opus-4-7`.

### Files to create / modify

| File | Action |
|---|---|
| `services/claudeService.ts` | **Create** |
| `hooks/useChats.ts` | **Modify** — same two call sites |

### Implementation: `services/claudeService.ts`

Install the SDK: `npm install @anthropic-ai/sdk`

```ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export function streamClaudeResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone:  () => void,
  onError: (err: Error) => void
): () => void {
  let cancelled = false;

  (async () => {
    try {
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages,
      });

      stream.on('text', (text) => {
        if (!cancelled) onChunk(text);
      });

      await stream.finalMessage();
      if (!cancelled) onDone();
    } catch (err) {
      if (!cancelled) onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => { cancelled = true; };
}
```

See [`connecting.md §1 — Anthropic template`](./connecting.md#anthropic-claude-streaming).

### Anthropic-specific notes

- Claude does **not** use `stream: true` in the request body — it uses the `.stream()` method which internally negotiates SSE.
- The `cancelled` flag pattern is used instead of `AbortController` because the Anthropic SDK does not expose a standard `signal` option in its streaming interface. Setting `cancelled = true` stops the `onChunk` calls but does not abort the underlying network request immediately.
- Max tokens must be set explicitly (`max_tokens`); there is no default.
- `stream.finalMessage()` resolves after all events have been received — always `await` it before calling `onDone()`.

### Verification checklist

- [ ] `npm install @anthropic-ai/sdk` and `npm run type-check` exit 0
- [ ] `.env.local` with `VITE_ANTHROPIC_API_KEY=sk-ant-...`
- [ ] Streaming tokens arrive from Claude
- [ ] `onDone` is called exactly once after the last token
- [ ] Cancel (switch chat) stops further `onChunk` calls

---

## Phase 4 — Ollama

**Goal:** Support Ollama's local model server as an alternative to the Docker/llama.cpp path. Useful for users who already have Ollama installed.

### Why Ollama vs llama.cpp

Ollama wraps llama.cpp in a daemon with an HTTP API that is also OpenAI-compatible at `POST /api/chat` (native) and `POST /v1/chat/completions` (OpenAI-compat mode, enabled by default in Ollama ≥ 0.1.24). The llama.cpp service from Phase 1 **works with Ollama out of the box** — just point the Vite proxy at port `11434` instead of `8080`.

### Files to modify for Ollama

| File | Change |
|---|---|
| `vite.config.ts` | Change proxy target to `http://localhost:11434` |
| `docker-compose.yml` | Add optional Ollama service block |
| `.env.example` | Add `VITE_OLLAMA_BASE_URL=http://localhost:11434` |

### Minimal service file

Since Ollama's `/v1/chat/completions` is OpenAI-compatible, `services/llamaCppService.ts` can be reused as-is by updating the Vite proxy target. A dedicated `services/ollamaService.ts` is only needed if you want to call Ollama's native `/api/chat` endpoint, which provides additional metadata (e.g. `total_duration`, `load_duration`).

### Native Ollama endpoint (optional)

```ts
// services/ollamaService.ts — native /api/chat with NDJSON streaming
export function streamOllamaResponse(
  model: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone:  () => void,
  onError: (err: Error) => void
): () => void {
  const controller = new AbortController();

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal: controller.signal,
  }).then(async (res) => {
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const text: string = parsed?.message?.content ?? '';
          if (text) onChunk(text);
          if (parsed.done) { onDone(); return; }
        } catch { /* skip malformed line */ }
      }
    }
    onDone();
  }).catch((err) => {
    if ((err as Error).name !== 'AbortError') onError(err);
  });

  return () => controller.abort();
}
```

Note: Ollama's native endpoint returns NDJSON (newline-delimited JSON), not SSE. Each line is a complete JSON object. The `done: true` field signals the end of the stream — guard for it before `onDone()`.

### Verification checklist

- [ ] `ollama serve` running on port 11434
- [ ] `ollama pull llama3.1` (or any model)
- [ ] Vite proxy updated to `http://localhost:11434`
- [ ] Streaming tokens arrive in the UI
- [ ] `ollama list` shows available models to confirm the pull succeeded

---

## Phase 5 — Provider & Model Selector UI

**Goal:** Let users switch between providers (llama.cpp / OpenAI / Anthropic / Ollama) and models at runtime via a UI control, without touching code.

This is the most architecturally significant phase. It requires:
1. A **provider registry** that maps config key → service function
2. A **model selector** component in the UI
3. A **settings tab** for provider configuration
4. Optionally: reading `llm-connection.yaml` at runtime

### Architecture: provider registry

Create `services/providerRegistry.ts`:

```ts
export type ProviderKey = 'llm-llamacpp' | 'llm-openai' | 'llm-claude' | 'llm-ollama';

export type StreamFn = (
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onDone:  () => void,
  onError: (err: Error) => void
) => () => void;

// Populated at startup from user config or defaults
export const providerRegistry = new Map<ProviderKey, StreamFn>();
```

In `hooks/useChats.ts`, replace the static import with a registry lookup:
```ts
import { providerRegistry } from '../services/providerRegistry';

// Inside handleSendMessage:
const streamFn = providerRegistry.get(activeProvider);
if (!streamFn) { onError(new Error('No provider configured')); return; }
const cancel = streamFn(history, onChunk, onDone, onError);
```

### New state and UI pieces

| Item | File | Details |
|---|---|---|
| `activeProvider` state | `hooks/useChats.ts` or new `hooks/useProvider.ts` | Current provider key; persisted to localStorage |
| `activeModel` state | same hook | Current model name within provider |
| Model selector | `components/ModelSelector.tsx` | Dropdown in `TopNav` or `ChatInput` area |
| Provider settings tab | `components/Settings.tsx` | New "Model" tab with provider selector + API key fields |

### Settings → new "Model" tab

Add a fourth tab alongside Account / Appearance / Privacy:
```
type TabId = 'account' | 'appearance' | 'privacy' | 'model';
```

Tab content:
- Provider radio buttons: llama.cpp · OpenAI · Anthropic · Ollama
- Per-provider: API key input (masked), base URL input, model name dropdown
- "Test connection" button that calls `/v1/models` (or equivalent) and shows a status badge

### Reading `llm-connection.yaml` at runtime (optional)

The YAML config at `.claude/llm-connection-example-specs.yaml` documents supported backends. To parse it at runtime:

1. Copy `llm-connection-example-specs.yaml` → `public/llm-connection.yaml` (makes it fetchable)
2. Install `npm install js-yaml`
3. On app init, `fetch('/llm-connection.yaml')`, parse, and populate `providerRegistry`

This allows zero-code provider switching for users who self-host the Docker image.

### Verification checklist

- [ ] User can switch from llama.cpp to OpenAI in Settings and send a message
- [ ] Active provider/model persisted across page reloads
- [ ] Switching provider mid-stream cancels the current request correctly
- [ ] "Test connection" shows green/red status badge

---

## Phase 6 — UX Completions

These are self-contained improvements that can be done in any order.

### 6.1 — Stop generation button

**Problem:** The cancel function is wired in `hooks/useChats.ts` but there is no UI button to call it during streaming.

**Files:** `components/ChatInput.tsx`, `hooks/useChats.ts`

**Implementation:**
- Expose `isStreaming` from `useChats` (it's currently derived inside `ChatArea`)
- Pass a `handleStopStream` function through context
- In `ChatInput`, when `isStreaming` is true, replace the Send button with a Stop button that calls `handleStopStream`

```tsx
// ChatInput — when isStreaming, show stop button
{isStreaming ? (
  <button onClick={handleStopStream} className="...">
    <Square size={20} />  {/* Stop icon */}
  </button>
) : (
  <button onClick={handleSend} disabled={!input.trim()} className="...">
    <Send size={20} />
  </button>
)}
```

**State change in `hooks/useChats.ts`:**
```ts
const handleStopStream = useCallback(() => {
  cancelActiveStream();
  // Mark the streaming message as complete
  setChats(prev => prev.map(chat => ({
    ...chat,
    messages: chat.messages.map(msg =>
      msg.isStreaming ? { ...msg, isStreaming: false } : msg
    ),
  })));
}, [cancelActiveStream]);
```

Add `handleStopStream` to `ChatActionsContextValue` in `context/ChatContext.tsx`.

### 6.2 — System prompt

**Problem:** There is no way to set a persona or instruction prefix for the model.

**Files:** `services/llamaCppService.ts` (and all provider services), `hooks/useChats.ts`, `components/Settings.tsx`

**Implementation:**
- Add a `systemPrompt` field to `UIState` (persisted via `utils/storage.ts`)
- Prepend it to the history array before calling any service:
  ```ts
  const fullHistory = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...history]
    : history;
  ```
- Update service signatures to accept `system` messages — already valid in OpenAI and Anthropic APIs; llama-server supports it too
- Add a text area in Settings → Model tab (or a dedicated "System" tab)

### 6.3 — Theme picker (Settings → Appearance)

**Problem:** The three theme buttons (System / Light / Dark) in Settings are decorative only. Real toggle is the TopNav button.

**Files:** `components/Settings.tsx`, `hooks/useTheme.ts`

**Implementation:**
- Pass `theme` and `toggleTheme` into Settings (currently it reads from `useUIState`, not `useTheme`)
- Replace the decorative buttons with radio-button logic that calls `toggleTheme()` or sets a `'system'` mode
- For system mode: add a `matchMedia('(prefers-color-scheme: dark)')` listener in `useTheme.ts`

### 6.4 — User avatar & display name

**Problem:** Avatar is a `picsum.photos` placeholder; "You" / "Aura" names are hardcoded in `MessageBubble`.

**Files:** `components/MessageBubble.tsx`, `components/Settings.tsx`

**Implementation:**
- Add `userName` and `userAvatarUrl` to `UIState`
- Wire "Edit Profile" button in Settings to a form that updates those fields
- `MessageBubble` reads `userName` from context instead of the hardcoded `'You'`

### 6.5 — Chat search

**Problem:** No way to find past conversations.

**Files:** New `components/SearchModal.tsx`, `components/Sidebar.tsx`, `hooks/useChats.ts`

**Implementation:**
- Add a search input to the sidebar header
- Filter `chats` by title + message content using a debounced string match
- Highlight matching text with a `<mark>` wrapper
- Keyboard shortcut: `⌘F` opens search (add to `hooks/useKeyboardShortcuts.ts`)

### 6.6 — Export chat

**Problem:** No way to save a conversation.

**Files:** New `utils/exportChat.ts`, `components/MessageActionMenu.tsx` or `components/TopNav.tsx`

**Implementation:**
```ts
// utils/exportChat.ts
export function exportChatAsMarkdown(chat: ChatSession): void {
  const lines = chat.messages.map(m =>
    `**${m.role === 'ai' ? 'Assistant' : 'You'}** (${new Date(m.timestamp).toLocaleString()})\n\n${m.content}`
  );
  const md = `# ${chat.title}\n\n${lines.join('\n\n---\n\n')}`;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${chat.title.replace(/\s+/g, '-')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 6.7 — Enforce "Chat History" toggle

**Problem:** The Chat History toggle in Settings is stored but chats are always persisted regardless.

**Files:** `hooks/useChats.ts`, `utils/storage.ts`

**Implementation:**
```ts
// In the useEffect that syncs to localStorage:
useEffect(() => {
  if (chatHistory) setStoredChats(chats);
  else setStoredChats([]);  // don't persist when history is off
}, [chats, chatHistory]);
```

---

## Phase 7 — Advanced Features

Lower priority; implement after Phase 5 is stable.

### 7.1 — Server-side proxy (production security)

Browser-side API keys are visible in DevTools. For any real deployment:

1. Create a minimal Express/Hono/Bun server at `server/proxy.ts`
2. `POST /api/chat` → forwards to the real provider, attaches the server-side API key
3. Update all service files to call `/api/chat` instead of the provider's API directly
4. Remove `dangerouslyAllowBrowser: true` from SDK constructors
5. Update Vite proxy to forward `/api` → the proxy server (or use nginx in Docker)

See [`connecting.md §8`](./connecting.md#8-integration-checklist).

### 7.2 — Streaming abort button (mobile)

The stop button from Phase 6.1 is the same feature but needs mobile-specific UX: a floating FAB over the message area when streaming is active on small screens.

### 7.3 — Multi-modal input (images)

The `+` attach button in `ChatInput` is already visible but has no handler. To implement:
- Accept image files via `<input type="file" accept="image/*">`
- Convert to base64 or upload to a staging endpoint
- Pass as `content: [{ type: 'image_url', image_url: { url: ... } }]` in the message array (OpenAI vision format)
- Only OpenAI gpt-4o, Claude claude-opus-4-7, and llama.cpp with vision models support this

### 7.4 — Conversation branching

Allow editing a user message and generating a new AI response from that edited point, creating a branch in the conversation tree. This requires:
- Storing `parentId` on messages
- Rendering a branch switcher UI at branching points
- Significant changes to `ChatSession.messages: Message[]` (would become a tree, not a flat array)

### 7.5 — Context window indicator

Show the user how much of the model's context window is being used. Estimate tokens from message content length (rough heuristic: `content.length / 4`) and display a progress bar in the chat header.

---

## File Map at a Glance

```
services/
  mockAiService.ts         ← Phase 0: mock only; keep for dev/testing
  llamaCppService.ts       ← Phase 1: llama.cpp / Ollama ✅ created
  openAiService.ts         ← Phase 2: to create
  claudeService.ts         ← Phase 3: to create
  ollamaService.ts         ← Phase 4: optional (OpenAI-compat suffices)
  providerRegistry.ts      ← Phase 5: to create

hooks/
  useChats.ts              ← All phases: provider swap point, history, errors ✅ updated
  useProvider.ts           ← Phase 5: to create (activeProvider/model state)
  useTheme.ts              ← Phase 6.3: add system mode
  useUIState.ts            ← Phase 6: add systemPrompt, userName, userAvatarUrl
  useKeyboardShortcuts.ts  ← Phase 6.5: add ⌘F search shortcut

components/
  ChatInput.tsx            ← Phase 6.1: add stop button
  Settings.tsx             ← Phase 5 + 6.2: add Model tab, system prompt
  ModelSelector.tsx        ← Phase 5: to create
  SearchModal.tsx          ← Phase 6.5: to create
  MessageBubble.tsx        ← Phase 6.4: replace hardcoded names
  TopNav.tsx               ← Phase 6.6: export button

utils/
  exportChat.ts            ← Phase 6.6: to create
  storage.ts               ← Phase 6.7: enforce chatHistory toggle

context/
  ChatContext.tsx           ← Phase 6.1: add handleStopStream

types.ts                   ← Read-only; extend Message if branching (7.4)

Dockerfile                 ← Phase 1 ✅ created
docker-compose.yml         ← Phase 1 ✅ created
nginx.conf                 ← Phase 1 ✅ created
.dockerignore              ← Phase 1 ✅ created
```

---

## Integration Checklist (from `connecting.md §8`, extended)

Use this before marking any phase as done:

- [ ] Service function signature matches: `(messages, onChunk, onDone, onError) => cancel`
- [ ] `onChunk` fires at least once with a non-empty string per response
- [ ] `onDone` fires exactly once after the final chunk; `isStreaming` becomes `false`
- [ ] Cancel works: switch chat mid-stream → no further `setChats` mutations
- [ ] History passed: second message in a conversation includes prior context
- [ ] Role mapping: all `'ai'` → `'assistant'` before sending to provider
- [ ] Error handling: network failure shows error bubble, not a blank/stuck message
- [ ] `npm run build` exits 0 with no TypeScript errors
- [ ] `npm test` passes
- [ ] E2E tests pass: `npm run test:e2e`
