import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-server',
    'coverage',
    'data',
    'playwright-report',
    'test-results',
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,

  // Browser code
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      // The model selector loads data in effects that flip a "loading" flag first.
      // That is deliberate here; the rule mostly matters for React Compiler adoption.
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },

  // Node code: Express server, tooling config and e2e helpers
  {
    files: ['server/**/*.ts', '*.config.{ts,js}', 'e2e/**/*.{ts,mjs}', 'tests/server/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  // Must stay last: turns off rules that would fight Prettier
  prettier,
]);
