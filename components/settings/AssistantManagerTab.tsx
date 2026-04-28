import React, { useState } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { Plus, Trash2, Pencil, X } from '../Icons';
import { Assistant } from '../../types';

const EMOJI_PRESETS = ['🤖', '🧑‍💻', '🎓', '🎨', '🔬', '📝', '🗺️', '🧙‍♂️', '👨‍⚕️', '📊'];

interface FormState {
  name: string;
  avatarEmoji: string;
  systemPrompt: string;
}

const emptyForm = (): FormState => ({ name: '', avatarEmoji: '🤖', systemPrompt: '' });

export const AssistantManagerTab: React.FC = () => {
  const { assistants, activeAssistantId, addAssistant, updateAssistant, deleteAssistant, setActiveAssistant } = useSettingsContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());

  const handleSaveAdd = () => {
    const name = addForm.name.trim();
    const systemPrompt = addForm.systemPrompt.trim();
    if (!name) return;
    addAssistant({ name, avatarEmoji: addForm.avatarEmoji, systemPrompt });
    setAddForm(emptyForm());
    setIsAdding(false);
  };

  const startEdit = (a: Assistant) => {
    setEditingId(a.id);
    setEditForm({ name: a.name, avatarEmoji: a.avatarEmoji, systemPrompt: a.systemPrompt });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateAssistant(editingId, {
      name: editForm.name.trim(),
      avatarEmoji: editForm.avatarEmoji,
      systemPrompt: editForm.systemPrompt.trim(),
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Assistant Manager</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Create custom assistants with unique personalities. The active assistant's system prompt is injected into every conversation.</p>
      </div>

      {/* Active indicator */}
      {activeAssistantId && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Active: <span className="font-semibold">{assistants.find(a => a.id === activeAssistantId)?.name ?? 'Unknown'}</span>
          <button onClick={() => setActiveAssistant(null)} className="ml-auto text-xs underline hover:no-underline">Clear</button>
        </div>
      )}

      {!activeAssistantId && assistants.length > 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No assistant active — click "Set Active" to enable one.</p>
      )}

      {/* List */}
      <div className="space-y-3">
        {assistants.length === 0 && !isAdding && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No assistants yet. Create one below.</p>
        )}

        {assistants.map(assistant => (
          <div key={assistant.id} className={`rounded-xl border-2 transition-colors ${activeAssistantId === assistant.id ? 'border-green-400 dark:border-green-600' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800`}>
            {editingId === assistant.id ? (
              <div className="p-4 space-y-3">
                <div className="flex gap-2 items-center">
                  <span className="text-2xl">{editForm.avatarEmoji}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_PRESETS.map(e => (
                      <button key={e} onClick={() => setEditForm(f => ({ ...f, avatarEmoji: e }))} className={`text-lg p-1 rounded-lg transition-colors ${editForm.avatarEmoji === e ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{e}</button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Assistant name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={editForm.systemPrompt}
                  onChange={e => setEditForm(f => ({ ...f, systemPrompt: e.target.value }))}
                  placeholder="System prompt / backstory…"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">Save</button>
                </div>
              </div>
            ) : (
              <div className="p-4 flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">{assistant.avatarEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">{assistant.name}</div>
                  {assistant.systemPrompt ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{assistant.systemPrompt}</p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">No system prompt</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {activeAssistantId !== assistant.id && (
                    <button onClick={() => setActiveAssistant(assistant.id)} className="text-xs px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                      Set Active
                    </button>
                  )}
                  <button onClick={() => startEdit(assistant)} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteAssistant(assistant.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add form */}
        {isAdding ? (
          <div className="p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 space-y-3">
            <div className="flex gap-2 items-center">
              <span className="text-2xl">{addForm.avatarEmoji}</span>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map(e => (
                  <button key={e} onClick={() => setAddForm(f => ({ ...f, avatarEmoji: e }))} className={`text-lg p-1 rounded-lg transition-colors ${addForm.avatarEmoji === e ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{e}</button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Assistant name"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={addForm.systemPrompt}
              onChange={e => setAddForm(f => ({ ...f, systemPrompt: e.target.value }))}
              placeholder="System prompt / backstory…"
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsAdding(false); setAddForm(emptyForm()); }} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"><X size={16} /></button>
              <button onClick={handleSaveAdd} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">Add</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm w-full"
          >
            <Plus size={16} />
            New Assistant
          </button>
        )}
      </div>
    </div>
  );
};
