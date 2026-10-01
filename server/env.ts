import fs from 'node:fs';
import path from 'node:path';

/**
 * Load .env.local and .env from the working directory into process.env.
 *
 * Variables that are already set in the real environment always win, and
 * .env.local wins over .env (process.loadEnvFile never overwrites an existing
 * key, so the more specific file is loaded first). Missing files are fine.
 */
export function loadEnvFiles(cwd: string = process.cwd()): string[] {
  const loaded: string[] = [];
  for (const name of ['.env.local', '.env']) {
    const file = path.join(cwd, name);
    if (fs.existsSync(file)) {
      process.loadEnvFile(file);
      loaded.push(name);
    }
  }
  return loaded;
}
