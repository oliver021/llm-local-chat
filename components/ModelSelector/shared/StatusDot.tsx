import type { ConnectionStatus } from '../../../services/modelDiscovery';

export function StatusDot({ status }: { status: ConnectionStatus | undefined }) {
  const color =
    !status || status === 'unknown' ? 'bg-gray-300 dark:bg-gray-600'
    : status === 'connected'       ? 'bg-green-400'
    : status === 'no-key'          ? 'bg-yellow-400'
    : 'bg-red-400';
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
}
