# Aura Chat

> **Preview project.** A feature-rich AI chat UI built to explore what a polished local-first chat interface can look like. Not production-hardened — but a strong starting point.

![Chat view](screenshots/chat.png)

---

## What It Is

Aura is a React + TypeScript chat interface that works with real AI backends out of the box. It handles the full UI layer — streaming responses, chat history, model discovery, markdown rendering — so you can focus on what your model actually does.

---

## Highlights

### Beautiful, polished design
Clean bubble layout, light/dark mode, smooth animations, responsive sidebar, and a typing indicator that stays alive until your model actually starts responding — important when running local inference where cold-start latency can be several seconds.

### Chat manager
Multi-session sidebar with pinned and recent conversations. Rename, delete (with confirm dialog), and pin any chat. All sessions persist in `localStorage` across page refreshes.

### Model manager
The real differentiator. Instead of hardcoding a model name, Aura ships with a full model selection modal:

- **llama.cpp tab** — two sub-tabs:
  - *Local*: lists models currently loaded in your running `llama-server`
  - *Browse HuggingFace*: live searchable GGUF browser with author avatars, download counts, quantization chips (Q4\_K\_M, Q5\_K\_M, Q8\_0…), a trusted-authors filter, and a download popover with a direct browser link + copyable `llama-cli` command

- **Ollama tab** — two sub-tabs:
  - *Installed*: models already pulled to your local Ollama instance
  - *Library*: searchable catalog of 35 popular Ollama models with quick-install `ollama pull` commands

### Multi-provider backend
Switch between providers without touching the UI. Supported out of the box:

| Provider | Type | Status |
|---|---|---|
| llama.cpp / llama-server | Local | ✅ Integrated |
| Ollama | Local | ✅ Integrated |
| OpenAI | Cloud | ✅ Integrated |
| Anthropic Claude | Cloud | ✅ Integrated |

Each provider is isolated in its own service file. Adding a new one is a two-file change.

### Streaming with stop control
Responses stream token by token. A **stop button** (■) replaces the send button while the model is generating — click it to halt inference mid-stream and keep whatever was received so far. Auto-scroll follows new tokens but steps aside the moment you scroll up to re-read something.

---

## Get Started

```bash
git clone https://github.com/your-org/aura-chat
cd aura-chat
npm install
npm run dev
# → http://localhost:5173
```

For local models, run `llama-server` or Ollama separately, then pick your model in the Model Selector (top-right).

```bash
npm run build        # Production build → dist/
npm run type-check   # TypeScript check
```

---

## Stack

| Tool | Role |
|---|---|
| React 18 + TypeScript | UI + type safety |
| Vite 6 | Dev server + builds |
| Tailwind CSS | Styling |
| react-markdown + Prism | Markdown + syntax highlighting |
| sonner | Toast notifications |
| lucide-react | Icons |

---

## License

MIT
