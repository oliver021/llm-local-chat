import React from 'react';
import { Info } from '../Icons';

/** Shown on settings that are stored but not wired to anything yet. */
export const PreviewNotice: React.FC = () => (
  <div
    role="note"
    className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 text-sm text-amber-800 dark:text-amber-300"
  >
    <Info size={18} className="flex-shrink-0 mt-0.5" />
    <span>
      <strong className="font-semibold">Preview.</strong> These settings are saved in your browser
      but not used yet.
    </span>
  </div>
);
