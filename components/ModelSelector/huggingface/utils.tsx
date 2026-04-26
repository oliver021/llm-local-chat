export function extractQuantLabel(filename: string): string | undefined {
  const m = filename.match(/[Qq][0-9][_KMkm0-9]*/);
  return m ? m[0].toUpperCase() : undefined;
}

export function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 capitalize">{value}</p>
    </div>
  );
}
