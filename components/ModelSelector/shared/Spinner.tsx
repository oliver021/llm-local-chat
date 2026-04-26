import { Loader2 } from '../../Icons';

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400">
      <Loader2 size={24} className="animate-spin mr-2" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
