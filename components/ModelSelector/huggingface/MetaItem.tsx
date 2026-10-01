export function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 capitalize">{value}</p>
    </div>
  );
}
