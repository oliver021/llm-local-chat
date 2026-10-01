import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

/** An error that should reach the client as-is. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'bad_request'
  ) {
    super(message);
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/** Forward sync throws and rejected promises to the Express error handler. */
export function wrap(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    try {
      const result = fn(req, res, next);
      if (result instanceof Promise) result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

/** Parse `data` with a zod schema or throw a 400 that names the offending fields. */
export function parseBody<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const detail = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
  throw new HttpError(400, `Invalid request — ${detail}`, 'invalid_request');
}

interface SqliteError extends Error {
  code?: string;
}

/** Final error middleware. Never leaks internals for unexpected errors. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // Headers already sent (e.g. a streaming response failed midway): let Express close the socket.
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  const e = err as SqliteError & { status?: number; expose?: boolean; type?: string };

  // body-parser: malformed JSON, payload too large, ...
  if (typeof e.status === 'number' && e.status >= 400 && e.status < 500 && e.expose) {
    res.status(e.status).json({ error: e.type ?? 'bad_request', message: e.message });
    return;
  }

  if (typeof e.code === 'string' && e.code.startsWith('SQLITE_CONSTRAINT')) {
    if (e.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      res.status(404).json({ error: 'not_found', message: 'The referenced chat does not exist' });
    } else {
      res.status(409).json({ error: 'conflict', message: 'A record with this id already exists' });
    }
    return;
  }

  console.error('[express]', err);
  res.status(500).json({ error: 'server_error', message: 'Internal server error' });
}
