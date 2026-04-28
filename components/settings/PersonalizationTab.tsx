import React, { useState } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { SettingToggle } from '../SettingToggle';
import { Plus, Trash2 } from '../Icons';

export const PersonalizationTab: React.FC = () => {
  const { personalization, updatePersonalization, addMemory, deleteMemory } = useSettingsContext();
  const [newMemory, setNewMemory] = useState('');

  const handleAddMemory = () => {
    const trimmed = newMemory.trim();
    if (!trimmed) return;
    addMemory(trimmed);
    setNewMemory('');
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Personalization</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Customize how the assistant knows and responds to you.</p>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Your Name</h4>
        <input
          type="text"
          value={personalization.displayName}
          onChange={e => updatePersonalization({ displayName: e.target.value })}
          placeholder="How should the assistant address you?"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Custom Instructions */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Custom Instructions</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">These instructions are injected into every conversation.</p>
        <textarea
          value={personalization.customInstructions}
          onChange={e => updatePersonalization({ customInstructions: e.target.value })}
          placeholder="e.g. Always respond in bullet points. Prefer concise answers."
          rows={4}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Memory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Memory</h4>
          <SettingToggle
            label=""
            description=""
            checked={personalization.memoriesEnabled}
            onToggle={() => updatePersonalization({ memoriesEnabled: !personalization.memoriesEnabled })}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">When enabled, these facts are included in every conversation.</p>

        {personalization.memoriesEnabled && (
          <div className="space-y-3">
            {personalization.memories.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No memories yet.</p>
            )}
            {personalization.memories.map(mem => (
              <div key={mem.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 group">
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{mem.content}</span>
                <button
                  onClick={() => deleteMemory(mem.id)}
                  aria-label="Delete memory"
                  className="p-1 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newMemory}
                onChange={e => setNewMemory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMemory()}
                placeholder="Add a new memory…"
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddMemory}
                disabled={!newMemory.trim()}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
