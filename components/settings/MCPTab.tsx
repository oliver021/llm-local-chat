import React, { useState } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { Plus, Trash2, Pencil, X } from '../Icons';
import { MCPServer } from '../../types';

interface EditState {
  name: string;
  urlOrCommand: string;
  enabled: boolean;
}

const emptyEdit = (): EditState => ({ name: '', urlOrCommand: '', enabled: true });

export const MCPTab: React.FC = () => {
  const { mcpServers, addMCPServer, updateMCPServer, deleteMCPServer } = useSettingsContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(emptyEdit());
  const [isAdding, setIsAdding] = useState(false);
  const [addState, setAddState] = useState<EditState>(emptyEdit());

  const handleSaveAdd = () => {
    const name = addState.name.trim();
    const urlOrCommand = addState.urlOrCommand.trim();
    if (!name || !urlOrCommand) return;
    addMCPServer({ name, urlOrCommand, enabled: addState.enabled });
    setAddState(emptyEdit());
    setIsAdding(false);
  };

  const startEdit = (server: MCPServer) => {
    setEditingId(server.id);
    setEditState({ name: server.name, urlOrCommand: server.urlOrCommand, enabled: server.enabled });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMCPServer(editingId, {
      name: editState.name.trim(),
      urlOrCommand: editState.urlOrCommand.trim(),
      enabled: editState.enabled,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">MCP Servers</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage Model Context Protocol server connections.</p>
      </div>

      {/* Server list */}
      <div className="space-y-3">
        {mcpServers.length === 0 && !isAdding && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No MCP servers configured.</p>
        )}

        {mcpServers.map(server => (
          <div key={server.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {editingId === server.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editState.name}
                  onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                  placeholder="Server name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={editState.urlOrCommand}
                  onChange={e => setEditState(s => ({ ...s, urlOrCommand: e.target.value }))}
                  placeholder="URL or command (e.g. npx @modelcontextprotocol/server-filesystem)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${server.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{server.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{server.urlOrCommand}</div>
                </div>
                <button onClick={() => updateMCPServer(server.id, { enabled: !server.enabled })} className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
                  {server.enabled ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => startEdit(server)} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteMCPServer(server.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add form */}
        {isAdding ? (
          <div className="p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 space-y-3">
            <input
              type="text"
              value={addState.name}
              onChange={e => setAddState(s => ({ ...s, name: e.target.value }))}
              placeholder="Server name"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={addState.urlOrCommand}
              onChange={e => setAddState(s => ({ ...s, urlOrCommand: e.target.value }))}
              placeholder="URL or command"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsAdding(false); setAddState(emptyEdit()); }} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"><X size={16} /></button>
              <button onClick={handleSaveAdd} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">Add</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm w-full"
          >
            <Plus size={16} />
            Add MCP Server
          </button>
        )}
      </div>
    </div>
  );
};
