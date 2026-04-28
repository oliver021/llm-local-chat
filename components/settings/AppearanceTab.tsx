import React from 'react';
import { Sun, Moon } from '../Icons';
import { useTheme } from '../../hooks/useTheme';
import { useUIState } from '../../hooks/useUIState';
import { SettingToggle } from '../SettingToggle';
import { ThemeName } from '../../types';

interface ThemeDefinition {
  name: ThemeName;
  label: string;
  description: string;
  primary: string;
  secondary: string;
  complementary: string;
}

const THEMES: ThemeDefinition[] = [
  {
    name: 'default',
    label: 'Blue',
    description: 'Clear sky',
    primary: '#3b82f6',
    secondary: '#6366f1',
    complementary: '#06b6d4',
  },
  {
    name: 'ocean',
    label: 'Ocean',
    description: 'Deep teal',
    primary: '#14b8a6',
    secondary: '#06b6d4',
    complementary: '#3b82f6',
  },
  {
    name: 'sunset',
    label: 'Sunset',
    description: 'Warm orange',
    primary: '#f97316',
    secondary: '#f59e0b',
    complementary: '#f43f5e',
  },
  {
    name: 'forest',
    label: 'Forest',
    description: 'Lush green',
    primary: '#10b981',
    secondary: '#22c55e',
    complementary: '#14b8a6',
  },
  {
    name: 'violet',
    label: 'Violet',
    description: 'Deep purple',
    primary: '#8b5cf6',
    secondary: '#a855f7',
    complementary: '#d946ef',
  },
  {
    name: 'rose',
    label: 'Rose',
    description: 'Vivid pink',
    primary: '#f43f5e',
    secondary: '#ec4899',
    complementary: '#ef4444',
  },
  {
    name: 'midnight',
    label: 'Midnight',
    description: 'Rich indigo',
    primary: '#6366f1',
    secondary: '#3b82f6',
    complementary: '#8b5cf6',
  },
  {
    name: 'gold',
    label: 'Gold',
    description: 'Warm amber',
    primary: '#f59e0b',
    secondary: '#eab308',
    complementary: '#f97316',
  },
];

interface ColorDotProps {
  color: string;
  label: string;
}

const ColorDot: React.FC<ColorDotProps> = ({ color, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="w-5 h-5 rounded-full ring-1 ring-black/10 dark:ring-white/10 flex-shrink-0"
      style={{ backgroundColor: color }}
      title={color}
    />
    <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 leading-none whitespace-nowrap">{label}</span>
  </div>
);

interface ThemeCardProps {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, isActive, onSelect }) => (
  <button
    onClick={onSelect}
    className={`relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
      isActive
        ? 'border-blue-500 shadow-md shadow-blue-500/20 dark:shadow-blue-500/10 scale-[1.02]'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-[1.01]'
    }`}
  >
    {/* Gradient preview bar */}
    <div
      className="h-14 w-full flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 50%, ${theme.complementary} 100%)`,
      }}
    />

    {/* Card body */}
    <div className="px-3 pt-2.5 pb-3 bg-white dark:bg-gray-800 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{theme.label}</div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{theme.description}</div>
        </div>
        {isActive && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: theme.primary }}
          >
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Color swatches */}
      <div className="flex items-end justify-between">
        <ColorDot color={theme.primary} label="Primary" />
        <ColorDot color={theme.secondary} label="Secondary" />
        <ColorDot color={theme.complementary} label="Complement" />
      </div>
    </div>
  </button>
);

export const AppearanceTab: React.FC = () => {
  const { theme, toggleTheme, themeName, setThemeName } = useTheme();
  const { compactMode, toggleCompactMode } = useUIState();

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Appearance</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Customize how the app looks and feels.</p>
      </div>

      {/* ── Color Theme ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Color Theme</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Applies to buttons, links, and all interactive elements.</p>
          </div>
          <div
            className="text-xs font-medium px-2 py-1 rounded-lg"
            style={{
              backgroundColor: `${THEMES.find(t => t.name === themeName)?.primary ?? '#3b82f6'}20`,
              color: THEMES.find(t => t.name === themeName)?.primary ?? '#3b82f6',
            }}
          >
            {THEMES.find(t => t.name === themeName)?.label ?? 'Blue'}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map(t => (
            <ThemeCard
              key={t.name}
              theme={t}
              isActive={themeName === t.name}
              onSelect={() => setThemeName(t.name)}
            />
          ))}
        </div>
      </section>

      {/* ── Light / Dark Mode ── */}
      <section className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Mode</h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Choose how the interface renders backgrounds and text.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Light */}
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              theme === 'light' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              <Sun size={20} />
            </div>
            <div className="text-center">
              <div className={`text-sm font-semibold ${theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>Light</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">Bright surfaces</div>
            </div>
            {theme === 'light' && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>

          {/* Dark */}
          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              <Moon size={20} />
            </div>
            <div className="text-center">
              <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>Dark</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">Easy on the eyes</div>
            </div>
            {theme === 'dark' && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
      </section>

      {/* ── Chat Density ── */}
      <section className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Chat Density</h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Control how much breathing room messages have.</p>
        </div>
        <SettingToggle
          label="Compact Mode"
          description="Reduce spacing between messages for a denser view."
          checked={compactMode}
          onToggle={toggleCompactMode}
        />
      </section>
    </div>
  );
};
