import { AlertCircle } from '../../Icons';

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-3 text-center px-4">
      <AlertCircle size={28} className="text-red-400" />
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      <button onClick={onRetry} className="text-xs text-blue-500 hover:underline">Try again</button>
    </div>
  );
}
