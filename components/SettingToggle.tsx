import React from 'react';

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

/**
 * Reusable accessible toggle switch for settings panels.
 * Uses role="switch" + aria-checked for screen-reader support.
 */
export const SettingToggle: React.FC<SettingToggleProps> = ({
  label,
  description,
  checked,
  onToggle,
}) => (
  <button
    onClick={onToggle}
    type="button"
    role="switch"
    aria-checked={checked}
    className="w-full flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
  >
    <div className="flex-1 text-left">
      <div className="font-medium text-gray-900 dark:text-white">{label}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
    </div>
    {/* Track */}
    <div className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
      {/* Thumb */}
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform duration-200 ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </div>
  </button>
);
