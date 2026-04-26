# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**llm-local-chat** — a React + TypeScript chat UI template (ChatGPT-like interface) that ships with a complete UI shell and a mock AI service, designed to be wired to any real LLM backend.

Key docs:
- **`roadmap.md`** — full feature status, phase-by-phase implementation plan, and what's UI-only vs functional
- **`connecting.md`** — data contracts, function signatures, and integration patterns every agent needs before touching backend code
- **`.claude/llm-connection-example-specs.yaml`** — backend YAML config schema

## Commands

```bash
npm run dev          # Start dev server (Vite, port 5173)
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run type-check   # TypeScript check (no emit)
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```

## Architecture

**State management** lives in `hooks/useChats.ts`. All chat state (sessions, streaming lifecycle, cancel) is managed with `useState`/`useCallback` and distributed via `context/ChatContext.tsx`.

**Data flow:**
```
components/ → context/ChatContext.tsx → hooks/useChats.ts → services/<provider>Service.ts → LLM
                                                          → utils/storage.ts → localStorage
```

**Key files:**
- `types.ts` — `Message`, `ChatSession`, `Theme` type definitions
- `constants.ts` — mock chat data and AI response strings
- `services/mockAiService.ts` — streaming mock (keep for tests; replace for real use)
- `services/llamaCppService.ts` — **live llama.cpp/llama-server integration** (Phase 1 ✅)
- `hooks/useChats.ts` — **primary integration seam** — swap provider import here
- `context/ChatContext.tsx` — action dispatcher; do not touch for backend work
- `utils/storage.ts` — localStorage persistence (chats, theme, UI state)

**Styling:** Tailwind CDN only. Custom theme colors and fonts are in the `<script>` tag in `index.html`, not in a config file.

## Integration — Two-Point Model

Every provider swap touches exactly two places (see `connecting.md` for full contracts):

1. **`services/<provider>Service.ts`** — the only file that talks to the network  
   Required signature:
   ```ts
   function streamXxxResponse(
     messages: Array<{ role: 'user' | 'assistant'; content: string }>,
     onChunk:  (chunk: string) => void,
     onDone:   () => void,
     onError:  (err: Error) => void
   ): () => void   // cancel function
   ```

2. **`hooks/useChats.ts`** — swap the import at two call sites:
   - `handleSendMessage` (~line 153)
   - `handleRegenerateMessage` (~line 260)

Role mapping — always apply before building history:
```ts
role: m.role === 'ai' ? 'assistant' : 'user'
```

## LLM Provider Roadmap

See `roadmap.md` for full implementation details per phase.

| Phase | Provider | Type | Config key | Status |
|---|---|---|---|---|
| 1 | llama.cpp / llama-server | Local (Docker) | `llm-llamacpp` | ✅ Done |
| 2 | OpenAI | Cloud API | `llm-openai` | Planned |
| 3 | Anthropic Claude | Cloud API | `llm-claude` | Planned |
| 4 | Ollama | Local | `llm-ollama` | Planned |
| 5 | Provider selector UI | — | — | Planned |

## Docker Quick-Start (Phase 1)

```bash
# Place a GGUF model
cp your-model.gguf ./models/model.gguf

# Build and run
docker compose up --build
# → http://localhost:3000

# Dev without Docker
./llama-server -m ./models/model.gguf --host 0.0.0.0 --port 8080
npm run dev
# → http://localhost:5173 (Vite proxy: /v1 → localhost:8080)
```
