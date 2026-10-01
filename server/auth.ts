import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest();

interface BasicAuthOptions {
  user: string;
  password: string;
  /** Requests for which authentication is not required (e.g. container health checks). */
  skip?: (req: Request) => boolean;
}

/**
 * HTTP Basic authentication. Browsers show their native login prompt and then
 * attach the credentials to every request, including fetch() calls to /api.
 * Use it behind HTTPS if the app is reachable from outside your machine.
 */
export function basicAuth({ user, password, skip }: BasicAuthOptions): RequestHandler {
  const expected = sha256(`${user}:${password}`);

  return (req, res, next) => {
    if (skip?.(req)) {
      next();
      return;
    }

    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() === 'basic' && encoded) {
      const given = sha256(Buffer.from(encoded, 'base64').toString('utf8'));
      // Compare digests: constant time, and the length of the secret is not revealed.
      if (timingSafeEqual(given, expected)) {
        next();
        return;
      }
    }

    res
      .status(401)
      .set('WWW-Authenticate', 'Basic realm="llm-local-chat", charset="UTF-8"')
      .json({ error: 'unauthorized', message: 'Authentication required' });
  };
}
