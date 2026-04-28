import React from 'react';
import { useSettingsContext } from '../context/SettingsContext';

interface AssistantPickerModalProps {
  onClose: () => void;
}

export const AssistantPickerModal: React.FC<AssistantPickerModalProps> = ({ onClose }) => {
  const { assistants, activeAssistantId, setActiveAssistant } = useSettingsContext();

  function pick(id: string | null) {
    setActiveAssistant(id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Choose an assistant</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {/* Default option */}
          <button
            onClick={() => pick(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
              activeAssistantId === null
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-2xl leading-none">🤖</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Default Assistant</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">No custom system prompt</div>
            </div>
            {activeAssistantId === null && (
              <ActiveDot />
            )}
          </button>

          {/* Custom assistants */}
          {assistants.map(a => (
            <button
              key={a.id}
              onClick={() => pick(a.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                activeAssistantId === a.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-2xl leading-none">{a.avatarEmoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.name}</div>
                {a.systemPrompt ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{a.systemPrompt}</div>
                ) : (
                  <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">No system prompt</div>
                )}
              </div>
              {activeAssistantId === a.id && (
                <ActiveDot />
              )}
            </button>
          ))}

          {assistants.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2 italic">
              No custom assistants yet — create one in Settings → Assistants.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

function ActiveDot() {
  return (
    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" aria-label="Active" />
  );
}
