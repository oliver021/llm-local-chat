import express from 'express';
import cors from 'cors';
import chatsRouter from './routes/chats.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/chats', chatsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server → http://localhost:${PORT}`);
});
