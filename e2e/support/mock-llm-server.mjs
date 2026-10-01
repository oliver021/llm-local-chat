#!/usr/bin/env node
/**
 * A tiny fake llama.cpp / OpenAI-compatible server for trying the app (and for
 * the e2e tests) without downloading a model.
 *
 *   node e2e/support/mock-llm-server.mjs            # listens on :8080
 *   MOCK_LLM_PORT=18080 node e2e/support/mock-llm-server.mjs
 *
 * It answers GET /v1/models and streams POST /v1/chat/completions as
 * server-sent events, one word at a time, echoing the last user message.
 */
import http from 'node:http';

const port = Number(process.env.MOCK_LLM_PORT ?? 8080);
const delayMs = Number(process.env.MOCK_LLM_DELAY_MS ?? 40);
const MODEL = 'mock-model.gguf';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/v1/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ object: 'list', data: [{ id: MODEL, object: 'model' }] }));
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let payload = {};
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'invalid JSON' } }));
      return;
    }

    const lastUser = [...(payload.messages ?? [])].reverse().find((m) => m.role === 'user');
    const reply = `Mock reply. You said: "${lastUser?.content ?? ''}"`;
    const words = reply.split(' ');

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    let closed = false;
    res.on('close', () => (closed = true));

    for (const [i, word] of words.entries()) {
      if (closed) return;
      const delta = { content: (i === 0 ? '' : ' ') + word };
      res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta }] })}\n\n`);
      await sleep(delayMs);
    }
    if (!closed) res.end('data: [DONE]\n\n');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'not found' } }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Mock LLM server on http://127.0.0.1:${port} (model: ${MODEL})`);
});
