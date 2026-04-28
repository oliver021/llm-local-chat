import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import chatsRouter from './routes/chats.js';
import bookmarksRouter from './routes/bookmarks.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/chats', chatsRouter);
app.use('/api/bookmarks', bookmarksRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// 404 — no route matched
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
});

// Global error handler — must have 4 params so Express recognises it as error middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = (err as { status?: number })?.status ?? 500;
  console.error('[express]', err);
  res.status(status).json({ error: 'server_error', message });
});

process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught exception:', err);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server → http://localhost:${PORT}`);
});
