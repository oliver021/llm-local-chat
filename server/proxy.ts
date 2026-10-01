import { Readable } from 'node:stream';
import type { Request, RequestHandler, Response } from 'express';

export interface ProxyRule {
  method: 'GET' | 'POST';
  /** Matched against the request path as it will be sent upstream (anchored, no query string). */
  path: RegExp;
}

export interface ProxyOptions {
  /** Shown in error messages and logs, e.g. "OpenAI". */
  name: string;
  /** Upstream base URL. May include a path (https://api.openai.com/v1). */
  target: string;
  /** Prepended to the incoming path (Express strips the mount point first). */
  pathPrefix?: string;
  /** Only these method + path combinations are forwarded; everything else is a 404. */
  allow: ProxyRule[];
  /** Headers sent when the browser did not provide its own (e.g. anthropic-version). */
  defaultHeaders?: Record<string, string>;
  /**
   * Headers that always replace whatever the browser sent, typically credentials.
   * Return null when the upstream is not configured; the client then gets a 503.
   */
  upstreamHeaders?: () => Record<string, string> | null;
  /** Message sent with the 503 when upstreamHeaders() returns null. */
  notConfiguredMessage?: string;
  /** Max time to wait for response headers. Streaming bodies are not limited. */
  headersTimeoutMs?: number;
  /** Max accepted request body. */
  maxBodyBytes?: number;
}

/** Request headers worth forwarding. Everything else (cookies, auth, origin, ...) is dropped. */
const FORWARDED_REQUEST_HEADERS = ['content-type', 'accept', 'anthropic-version', 'anthropic-beta'];

/** Response headers worth relaying back to the browser. */
const RELAYED_RESPONSE_HEADERS = ['content-type', 'retry-after', 'x-request-id', 'request-id'];

function sendError(res: Response, status: number, type: string, message: string): void {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  // Shaped like both the OpenAI and Anthropic error envelopes so their SDKs surface `message`.
  res.status(status).json({ type: 'error', error: { type, message } });
}

async function readBody(req: Request, limit: number): Promise<Buffer | 'too-large'> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > limit) return 'too-large';
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function describeNetworkError(err: unknown): string {
  const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
  return cause?.code ?? cause?.message ?? (err instanceof Error ? err.message : String(err));
}

/**
 * Small streaming reverse proxy for one upstream service.
 *
 * - Only allow-listed method + path pairs are forwarded, so a proxied API key
 *   or local model server cannot be used for anything the app does not need.
 * - Paths are normalised before matching, so `..` and `%2e%2e` cannot escape the allow-list.
 * - Redirects are never followed and credentials never leave for another origin.
 * - Responses are streamed as they arrive (SSE works), and a browser disconnect
 *   (the stop button) cancels the upstream request so generation stops too.
 */
export function createProxy(options: ProxyOptions): RequestHandler {
  const target = new URL(options.target);
  const basePath = target.pathname.replace(/\/+$/, '');
  const maxBody = options.maxBodyBytes ?? 10 * 1024 * 1024;
  const headersTimeout = options.headersTimeoutMs ?? 120_000;

  return async (req, res) => {
    if (!req.url.startsWith('/')) {
      sendError(res, 400, 'bad_request', 'Invalid path');
      return;
    }
    // Concatenate instead of resolving: "//host/path" must stay a path, not become a host.
    const incoming = new URL(`http://proxy.invalid${req.url}`);
    const upstreamPath = (options.pathPrefix ?? '') + incoming.pathname;

    const allowed = options.allow.some(
      (rule) => rule.method === req.method && rule.path.test(upstreamPath)
    );
    if (!allowed) {
      sendError(res, 404, 'not_found', `${req.method} ${incoming.pathname} is not available through this proxy`);
      return;
    }

    let injected: Record<string, string> = {};
    if (options.upstreamHeaders) {
      const result = options.upstreamHeaders();
      if (result === null) {
        sendError(res, 503, 'not_configured', options.notConfiguredMessage ?? `${options.name} is not configured on the server`);
        return;
      }
      injected = result;
    }

    const upstreamUrl = new URL(target.origin + basePath + upstreamPath + incoming.search);
    if (upstreamUrl.origin !== target.origin) {
      sendError(res, 400, 'bad_request', 'Invalid path');
      return;
    }

    const headers: Record<string, string> = { ...options.defaultHeaders };
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = req.headers[name];
      if (typeof value === 'string') headers[name] = value;
    }
    Object.assign(headers, injected);

    let body: Buffer | undefined;
    if (req.method === 'POST') {
      const read = await readBody(req, maxBody);
      if (read === 'too-large') {
        sendError(res, 413, 'request_too_large', 'Request body is too large');
        return;
      }
      body = read;
    }

    // Abort the upstream request when the browser goes away (stop button, tab closed).
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) controller.abort();
    });
    const timer = setTimeout(() => controller.abort(new Error('headers-timeout')), headersTimeout);

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        body,
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (res.destroyed) return; // client already gone
      if (controller.signal.reason instanceof Error && controller.signal.reason.message === 'headers-timeout') {
        sendError(res, 504, 'upstream_timeout', `${options.name} did not respond within ${Math.round(headersTimeout / 1000)}s`);
      } else {
        console.warn(`[proxy:${options.name}] ${req.method} ${upstreamPath} failed: ${describeNetworkError(err)}`);
        sendError(res, 502, 'upstream_unreachable', `Could not reach ${options.name} at ${target.origin}. Is it running?`);
      }
      return;
    }
    clearTimeout(timer);

    res.status(upstream.status);
    for (const name of RELAYED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    // Tell intermediaries not to buffer or cache streamed tokens.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');

    if (!upstream.body) {
      res.end();
      return;
    }

    res.flushHeaders();
    const stream = Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  };
}
