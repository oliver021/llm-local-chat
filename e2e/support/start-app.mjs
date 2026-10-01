#!/usr/bin/env node
/**
 * Starts the production server for the e2e tests against a fresh database.
 * Expects `npm run build` to have run (playwright.config.ts does that first).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = process.env.DATA_DIR ?? path.join(root, 'test-results', 'e2e-data');

fs.rmSync(dataDir, { recursive: true, force: true });
process.env.DATA_DIR = dataDir;

await import(path.join(root, 'dist-server/server/index.js'));
