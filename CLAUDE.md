# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Production build
npm run preview  # Preview production build
```

No lint or test scripts are configured.

## Architecture

This is a React + TypeScript chat UI template (ChatGPT-like interface) using Vite and Tailwind CSS (loaded via CDN in `index.html`, not PostCSS).

**State management** lives entirely in `App.tsx` — there is no external state library. All state (active chat, theme, sidebar visibility, chat sessions) is managed with `useState`/`useCallback` and passed as props down the tree.

**Data flow:**
- `App.tsx` holds all chat sessions and dispatches updates
- Mock AI responses are generated from a pool in `constants.ts` with a simulated 1-2s delay
- No real API integration exists; `vite.config.ts` has proxy routes stubbed but unused

**Key files:**
- `types.ts` — `Message`, `ChatSession`, `Theme` type definitions
- `constants.ts` — initial mock chat data and AI response strings
- `components/Icons.tsx` — wraps `lucide-react` icons used throughout

**Styling:** Tailwind classes only; custom theme colors and fonts are configured inside the `<script>` tag in `index.html`, not in a `tailwind.config.js` file.
