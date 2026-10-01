import { AppError, makeAppError } from '../types';

/** Route the OpenAI / Anthropic SDKs talk to. The real API keys live on the server. */
export const OPENAI_PROXY_PATH = '/api/proxy/openai';
export const ANTHROPIC_PROXY_PATH = '/api/proxy/anthropic';

/** The SDKs need an absolute base URL, so anchor the proxy path to the current origin. */
export function proxyBaseUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

function isAppError(err: unknown): err is AppError {
  return err instanceof Error && typeof (err as Partial<AppError>).code === 'string';
}

/**
 * Turn an error thrown by a cloud SDK (or by our server's proxy in front of it)
 * into an AppError whose message tells the user what to do next.
 */
export function toProviderError(providerName: string, err: unknown): AppError {
  if (isAppError(err)) return err;

  const message = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number } | null)?.status;

  if (/not set on the server/i.test(message)) {
    return makeAppError(message, 'AUTH_MISSING', {
      userFacing: true,
      userMessage: `${providerName} is not configured. Add its API key to .env and restart the server.`,
    });
  }
  if (status === 401 || status === 403) {
    return makeAppError(message, 'AUTH_INVALID', {
      userFacing: true,
      userMessage: `${providerName} rejected the API key configured on the server. Check it in .env.`,
    });
  }
  if (status === 429) {
    return makeAppError(message, 'MODEL_ERROR', {
      userFacing: true,
      userMessage: `${providerName} rate limit reached. Wait a moment and try again.`,
      retryable: true,
    });
  }
  if (status === 502 || status === 504 || /failed to fetch|networkerror/i.test(message)) {
    return makeAppError(message, status === 504 ? 'NETWORK_TIMEOUT' : 'NETWORK_UNREACHABLE', {
      userFacing: true,
      userMessage: `Could not reach ${providerName}. Check the server's network connection.`,
      retryable: true,
    });
  }
  return makeAppError(message, 'MODEL_ERROR', {
    userFacing: true,
    userMessage: `${providerName} returned an error: ${message.slice(0, 300)}`,
    retryable: true,
  });
}
