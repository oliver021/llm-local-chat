# Architecture

Aura is one Node process plus a React single-page app. In development Vite serves the UI and
proxies everything else to the server; in production the server serves the built UI itself.

```
                         ┌────────────────────────── Express server ──────────────────────────┐
                         │                                                                    │
 Browser (React) ───────►│  /api/chats, /api/bookmarks ──► SQLite (DATA_DIR/chat.db)          │
                         │  /api/providers ──────────────► which API keys are configured      │
                         │  /v1/*            ──► proxy ──► llama-server  (LLAMA_SERVER_URL)   │
                         │  /ollama/*        ──► proxy ──► Ollama        (OLLAMA_URL)         │
                         │  /api/proxy/openai    ► proxy ► OpenAI-compatible API  + API key   │
                         │  /api/proxy/anthropic ► proxy ► Anthropic API          + API key   │
                         │  everything else  ──────────► built UI (dist/) with SPA fallback   │
                         └────────────────────────────────────────────────────────────────────┘
```

## Server (`server/`)

| File | Responsibility |
|---|---|
| `index.ts` | Entry point: loads `.env`, builds the config, opens the database, listens, shuts down gracefully. |
| `app.ts` | `createApp({ config, db })`: security headers, auth, proxies, routers, static files, error handling. No global state, so tests build one per case. |
| `config.ts` | Reads and validates environment variables into a typed `ServerConfig`. Bad values fail at start-up with a message that names the variable. |
| `env.ts` | Loads `.env.local` and `.env` without overriding real environment variables. |
| `db.ts` | `openDatabase(file)`: schema, migrations and indexes. `":memory:"` is supported. |
| `auth.ts` | Optional HTTP Basic authentication (constant-time comparison). |
| `proxy.ts` | `createProxy(options)`: the streaming reverse proxy described below. |
| `http.ts` | `HttpError`, async handler wrapper, body validation with zod, the final error handler. |
| `routes/` | `chats.ts`, `bookmarks.ts` (CRUD with validation) and `providers.ts`. |

### The proxy

Every model backend goes through `createProxy`, configured once in `app.ts`:

| Mount point | Upstream | Allowed requests |
|---|---|---|
| `/v1` | `LLAMA_SERVER_URL` | `GET /v1/models`, `POST /v1/chat/completions` |
| `/ollama` | `OLLAMA_URL` | `GET /api/tags`, `GET /api/version`, `POST /api/show`, `POST /api/chat`, `POST /api/generate`, `GET /v1/models`, `POST /v1/chat/completions` |
| `/api/proxy/openai` | `OPENAI_BASE_URL` | `GET /models`, `POST /chat/completions` (adds `Authorization`) |
| `/api/proxy/anthropic` | `ANTHROPIC_BASE_URL` | `GET /v1/models`, `POST /v1/messages` (adds `x-api-key` and a default `anthropic-version`) |

What it guarantees (each point has a test in `tests/server/proxy.test.ts`):

- Only allow-listed method and path pairs are forwarded; anything else is a 404 and never reaches the upstream.
- The path is normalised before it is matched, so `..` and `%2e%2e` cannot step outside the allow-list, and
  `//host/path` stays a path.
- Only a few request headers are forwarded. Cookies, `Authorization` and `x-api-key` from the browser are
  dropped; credentials come from the server's configuration.
- Redirects are not followed, so credentials cannot be sent to another origin.
- Responses are streamed as they arrive. When the browser disconnects (the stop button, a closed tab) the
  upstream request is aborted, so the model stops generating.
- Failures are reported as JSON the UI can show: 502 when the upstream is down, 504 on a header timeout,
  503 when an API key is missing, 413 for oversized bodies.

### Database

SQLite through `better-sqlite3`, in WAL mode. Tables: `chat_sessions`, `messages`, `bookmarks`, `settings`.
Messages and bookmarks reference their chat with `ON DELETE CASCADE`. Message ids are primary keys across
all chats, so copying a chat must assign new ids (`useChats.handleCopyChat` does).

`openDatabase` adds missing columns for databases created by earlier versions.

## Client

```
components/ ──► context/ChatContext ──► hooks/useChats ──► services/providerDispatch ──► provider
                                                     └───► utils/chatApi ──────────────► /api/chats
```

- `hooks/useChats.ts` owns all chat state: loading, sending, streaming, stopping, regenerating, copying.
  It updates React state first and mirrors every change to the server (`db(...)` helper), so the UI stays
  responsive and keeps working in memory if the server is briefly unavailable.
- `context/ChatContext.tsx` hands those actions to components, which never import `useChats` directly.
- `services/providerDispatch.ts` returns a streaming function for the active provider. Every provider
  function has the same signature:

  ```ts
  (messages, onChunk, onDone, onError, systemPrompt?) => cancel
  ```

- `services/genericStreamService.ts` speaks the OpenAI-compatible SSE format used by llama.cpp and Ollama.
  `openAiService.ts` and `claudeService.ts` use the official SDKs, pointed at the server's proxy routes with
  a placeholder key.
- `services/modelDiscovery.ts` lists models for the model dialog and checks provider status.
- `services/providerErrors.ts` turns SDK and proxy failures into messages that say what to do next.
- Preferences (theme, selected model, assistants, personalization) live in `localStorage`
  (`utils/storage.ts`); conversations live in SQLite.

## Adding a provider

1. **Server.** If the provider needs a secret or is not on your machine, add its URL and key to
   `server/config.ts`, mount another `createProxy` in `server/app.ts` with the narrowest allow-list that
   works, and extend `routes/providers.ts` if the UI should know whether a key is set.
2. **Client types.** Add the key to `ProviderKey`, `PROVIDER_META` and `DEFAULT_MODELS` in
   `hooks/useProvider.ts`, and to `VALID_PROVIDERS` in `utils/storage.ts`.
3. **Streaming.** Add a case to `services/providerDispatch.ts`. If the provider speaks the OpenAI chat
   format, call `streamOpenAICompatible` with its base path; otherwise write a service with the signature
   above.
4. **Model list and status.** Add cases to `discoverModels` and `checkProviderStatus` in
   `services/modelDiscovery.ts`, a hint in `components/ModelSelector/shared/ProviderHint.tsx`, and the
   provider to the status loop in `components/ModelSelector/index.tsx`.
5. **Tests.** Follow `tests/client/services/providerDispatch.test.ts` and `tests/server/proxy.test.ts`.

## Testing

| Layer | Tooling | Where |
|---|---|---|
| Server | Vitest (node). The real app on an ephemeral port with an in-memory database and fake upstream servers; covers validation, auth, static files, the proxy, SSE streaming and client aborts. | `tests/server/` |
| Client | Vitest (jsdom) and Testing Library: utilities, services, `useChats`, components and the whole `<App />` against a fake server. | `tests/client/` |
| End to end | Playwright with the installed Chrome against the production build and `e2e/support/mock-llm-server.mjs`. | `e2e/` |

`useChats` has regression tests for bugs that were fixed once (stale system prompt, copied messages
reusing ids): if you change that hook, keep them green.
