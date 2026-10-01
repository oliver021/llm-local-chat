export function extractQuantLabel(filename: string): string | undefined {
  const m = filename.match(/[Qq][0-9][_KMkm0-9]*/);
  return m ? m[0].toUpperCase() : undefined;
}
