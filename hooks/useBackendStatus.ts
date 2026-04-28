import { useState, useEffect } from 'react';

export type BackendStatus = 'checking' | 'online' | 'offline';

export function useBackendStatus(intervalMs = 15_000): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const res = await fetch('/api/health', {
          signal: AbortSignal.timeout(3000),
        });
        if (mounted) setStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (mounted) setStatus('offline');
      }
    }

    check();
    const id = setInterval(check, intervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}
