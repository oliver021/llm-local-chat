# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project

**Aura Chat** (`llm-local-chat`): a self-hosted chat UI for llama.cpp, Ollama, OpenAI and Anthropic.
React 19 + TypeScript + Vite + Tailwind 4 on the client; one Express 5 + SQLite server that serves the UI,
stores chats and proxies to model servers (API keys never reach the browser).

Read `docs/architecture.md` first; `README.md` covers running it.

## Commands

```bash
npm run dev:all        # Vite (5173) + API with tsx watch (3001)
npm run build          # UI -> dist/, server -> dist-server/
npm start              # production server (serves dist/)
npm run lint           # ESLint, --max-warnings 0
npm run type-check     # tsc for the UI and for the server (two tsconfigs)
npm test               # Vitest: tests/client (jsdom) + tests/server (node)
npm run test:e2e       # Playwright; builds and starts its own app and mock model server
npm run mock:llm       # fake llama-server on :8080 for manual testing
```

Run `npm run lint && npm run type-check && npm test` before finishing; run `npm run test:e2e` after
touching chat flows, the server or the build.

## Architecture in brief

- **Server** (`server/`): `createApp({ config, db })` in `app.ts`; config from env in `config.ts`; streaming
  allow-listed proxies in `proxy.ts`; routers take their `db` as a parameter. ESM with `.js` import
  suffixes (NodeNext), compiled by `tsconfig.server.build.json`.
- **Client state**: `hooks/useChats.ts` owns chat state and mirrors changes to the server through
  `utils/chatApi.ts`. Components reach it only through `context/ChatContext.tsx`.
- **Providers**: `services/providerDispatch.ts` maps a provider to a streaming function
  `(messages, onChunk, onDone, onError, systemPrompt?) => cancel`. See "Adding a provider" in
  `docs/architecture.md` for every place to touch.
- **Styling**: Tailwind v4 through `@tailwindcss/postcss`; theme tokens live in `index.css` (`@theme`).
  There is no `tailwind.config.js`.

## Conventions and gotchas

- Never put a secret in a `VITE_*` variable: it ends up in the public bundle. Keys are read by the server only.
- Message ids are primary keys in SQLite. Anything that duplicates messages must generate new ids.
- Callbacks in `useChats` are memoised: keep their dependency arrays complete (lint fails on
  `react-hooks/exhaustive-deps` warnings for a reason; a stale `systemPrompt` was a real bug).
- Do not add third-party network requests from the UI (fonts, avatars, analytics). The CSP in
  `server/app.ts` blocks them and an e2e test fails on them.
- Web Search, MCP and Voice settings are UI-only previews; do not describe them as working.
- Add or update tests with every change. Server tests build the real app (`tests/server/helpers.ts`);
  client tests use `tests/client/services/helpers.ts` for fetch/SSE fakes.
