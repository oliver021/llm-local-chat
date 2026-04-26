/**
 * Markdown rendering components wired to Tailwind classes.
 *
 * Extracted from MessageBubble so it can be imported independently,
 * updated in one place, and tree-shaken if markdown is ever toggled off.
 *
 * - Code blocks: Prism + oneDark — looks good in both light and dark themes
 * - Inline code: subtle pill style
 * - Tables, blockquotes, lists: consistent spacing
 */

import React from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

// Register only the languages we need — prevents bundling ~500 kB of extras.
// Add more here as needed; each import is a small async chunk.
import tsx        from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python     from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash       from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json       from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css        from 'react-syntax-highlighter/dist/esm/languages/prism/css';

SyntaxHighlighter.registerLanguage('tsx',        tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts',         typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js',         javascript);
SyntaxHighlighter.registerLanguage('python',     python);
SyntaxHighlighter.registerLanguage('py',         python);
SyntaxHighlighter.registerLanguage('bash',       bash);
SyntaxHighlighter.registerLanguage('sh',         bash);
SyntaxHighlighter.registerLanguage('json',       json);
SyntaxHighlighter.registerLanguage('css',        css);

export const markdownComponents: Components = {
  // ── Code ────────────────────────────────────────────────────────────────
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '');
    const isBlock = !!match;
    const childrenStr = children ? String(children).replace(/\n$/, '') : '';

    if (isBlock) {
      return (
        <div className="my-3 rounded-xl overflow-x-auto border border-gray-200 dark:border-gray-700 text-sm">
          <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              {match[1]}
            </span>
          </div>
          <div className="overflow-x-auto">
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{ margin: 0, borderRadius: 0, padding: '1rem', fontSize: '0.8125rem', lineHeight: '1.6' }}
              {...props}
            >
              {childrenStr}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    }

    return (
      <code
        className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 font-mono text-[0.85em] break-words"
        {...props}
      >
        {children || ''}
      </code>
    );
  },

  // ── Typography ───────────────────────────────────────────────────────────
  p({ children })      { return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>; },
  strong({ children }) { return <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>; },
  em({ children })     { return <em className="italic text-gray-700 dark:text-gray-300">{children}</em>; },

  // ── Headings ─────────────────────────────────────────────────────────────
  h1({ children }) { return <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">{children}</h1>; },
  h2({ children }) { return <h2 className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white">{children}</h2>; },
  h3({ children }) { return <h3 className="text-base font-semibold mt-3 mb-1.5 text-gray-900 dark:text-white">{children}</h3>; },

  // ── Lists ────────────────────────────────────────────────────────────────
  ul({ children }) { return <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700 dark:text-gray-300 pl-2 break-words">{children}</ul>; },
  ol({ children }) { return <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-700 dark:text-gray-300 pl-2 break-words">{children}</ol>; },
  li({ children }) { return <li className="leading-relaxed break-words">{children}</li>; },

  // ── Blockquote ───────────────────────────────────────────────────────────
  blockquote({ children }) {
    return (
      <blockquote className="my-3 pl-4 border-l-4 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 py-2 pr-3 rounded-r-lg text-gray-700 dark:text-gray-300 italic overflow-hidden break-words">
        {children}
      </blockquote>
    );
  },

  // ── Table ────────────────────────────────────────────────────────────────
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm whitespace-nowrap">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return <th className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-left font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 break-words">{children}</th>;
  },
  td({ children }) {
    return <td className="px-4 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 last:border-0 break-words">{children}</td>;
  },

  // ── Horizontal rule ──────────────────────────────────────────────────────
  hr() { return <hr className="my-4 border-gray-200 dark:border-gray-700" />; },
};
