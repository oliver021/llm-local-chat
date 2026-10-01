import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { delta, jsonResponse, mockFetch, sseResponse } from './services/helpers';

/** A tiny in-memory stand-in for the server: chat API + a llama.cpp that replies "Hi there". */
function fakeServer() {
  const writes: string[] = [];
  const fetchMock = mockFetch().mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (method === 'GET' && url === '/api/chats') return jsonResponse([]);
    if (method === 'GET' && url === '/api/health') return jsonResponse({ ok: true });
    if (method === 'GET' && url === '/v1/models') return jsonResponse({ data: [{ id: 'model.gguf' }] });
    if (method === 'POST' && url === '/v1/chat/completions') {
      return sseResponse([delta('Hi '), delta('there'), 'data: [DONE]\n\n']);
    }
    if (url.startsWith('/api/')) {
      writes.push(`${method} ${url}`);
      return jsonResponse({ ok: true }, method === 'POST' ? 201 : 200);
    }
    throw new TypeError(`unexpected request: ${method} ${url}`);
  });
  return { fetchMock, writes };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('starts on the welcome screen with the backend marked online', async () => {
    fakeServer();
    render(<App />);
    expect(await screen.findByText('How can I help you today?')).toBeInTheDocument();
    expect(screen.getByText('Plan a weekend trip to Paris')).toBeInTheDocument();
  });

  it('sends a message, streams the reply and saves the chat', async () => {
    const { fetchMock, writes } = fakeServer();
    render(<App />);

    await userEvent.type(await screen.findByPlaceholderText('Message Aura…'), 'Hello model{Enter}');

    expect(await screen.findByText('Hi there')).toBeInTheDocument();
    expect(screen.getAllByText('Hello model').length).toBeGreaterThan(0);

    const completion = fetchMock.mock.calls.find(([url]) => url === '/v1/chat/completions');
    expect(JSON.parse(completion![1]!.body as string)).toMatchObject({
      stream: true,
      messages: [{ role: 'user', content: 'Hello model' }],
    });

    await waitFor(() => expect(writes.filter((w) => /POST \/api\/chats\/.+\/messages/.test(w))).toHaveLength(2));
    expect(writes[0]).toBe('POST /api/chats');
  });

  it('clicking a suggestion starts a conversation', async () => {
    fakeServer();
    render(<App />);
    await userEvent.click(await screen.findByText('Give me a healthy dinner recipe'));
    expect(await screen.findByText('Hi there')).toBeInTheDocument();
  });
});
