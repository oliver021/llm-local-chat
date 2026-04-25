# Roadmap

## Completed

- [x] Custom hooks — `useTheme`, `useChats`, `useUIState`
- [x] React Context for chat actions (no prop drilling)
- [x] Tailwind CSS via npm (v4, PostCSS, tree-shaken)
- [x] TypeScript strict mode + `tsconfig.json`
- [x] ESLint + Prettier + lint/format scripts
- [x] Mock AI service isolated in `services/mockAiService.ts`
- [x] `ChatItem` extracted as standalone component
- [x] `SUGGESTED_PROMPTS` extracted to `constants.ts`
- [x] `Setting.tsx` renamed to `Settings.tsx`

---

## Planned

### Phase 7 — Message Actions
- [ ] Copy message to clipboard
- [ ] Edit sent messages (inline, with history)
- [ ] Delete a message from a conversation
- [ ] Regenerate last AI response

### Phase 8 — Typing Indicator
- [ ] Animated "Aura is thinking..." state while AI responds
- [ ] Cancel in-flight response
- [ ] Error state + retry button when response fails

### Phase 9 — localStorage Persistence
- [ ] Persist theme selection across reloads
- [ ] Persist chat sessions (title, messages) in localStorage
- [ ] Clear persisted data from Settings > Privacy > Danger Zone

### Phase 10 — Markdown Rendering
- [ ] Render AI responses as Markdown (`react-markdown`)
- [ ] Code block syntax highlighting (`highlight.js` or `shiki`)
- [ ] Inline code, bold, italic, bullet list support in messages

### Phase 11 — Message Timestamps & Grouping
- [ ] Display per-message timestamps (hover or always-on)
- [ ] Group messages by date: Today, Yesterday, older dates
- [ ] Relative time labels ("2 minutes ago")

### Phase 12 — Chat Search
- [ ] Cmd+K / Ctrl+K command palette to filter chats
- [ ] Full-text search across all chat titles
- [ ] Keyboard navigation within search results

### Phase 13 — Polish & Accessibility
- [ ] Character counter in input (with soft limit visual)
- [ ] Keyboard shortcuts help modal (? key)
- [ ] ARIA labels and focus management
- [ ] Chat export to `.json` and `.txt`
- [ ] Message reactions (emoji picker, light interaction)
