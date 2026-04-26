import React, { useState, useEffect, useCallback } from 'react';
import { ChatSession, Message } from '../types';
import { X, Trash2 } from './Icons';
import { dbGetArchivedChats, dbUnarchiveChat, dbDeleteChat } from '../utils/chatApi';
import { toast } from 'sonner';

// ── Icons ──────────────────────────────────────────────────────────────────────

const ArchiveRestoreIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M9.5 14.5 12 12l2.5 2.5" />
    <path d="M12 12v6" />
  </svg>
);

const EyeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const EmptyArchiveIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600">
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatRelative(ts: number | undefined): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(ts);
}

function lastMessage(chat: ChatSession): Message | undefined {
  return chat.messages[chat.messages.length - 1];
}

function chatCreatedAt(chat: ChatSession): number {
  if (chat.createdAt) return chat.createdAt;
  // Fall back: parse timestamp from id (format: "chat-{timestamp}")
  const ts = parseInt(chat.id.replace('chat-', ''), 10);
  return isNaN(ts) ? chat.updatedAt : ts;
}

// ── Read-only chat viewer ──────────────────────────────────────────────────────

const ChatViewer: React.FC<{ chat: ChatSession; onClose: () => void }> = ({ chat, onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate max-w-sm">{chat.title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{chat.messages.length} messages · archived</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {chat.messages.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No messages in this conversation.</p>
        ) : (
          chat.messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Read-only banner */}
      <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-800/40 flex-shrink-0">
        <p className="text-xs text-amber-700 dark:text-amber-400 text-center font-medium">
          Read-only · Archived conversation
        </p>
      </div>
    </div>
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────────

interface ArchivedChatsPageProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

type SortKey = 'title' | 'messages' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';

export const ArchivedChatsPage: React.FC<ArchivedChatsPageProps> = ({ isOpen, onClose, onRestored }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewingChat, setViewingChat] = useState<ChatSession | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    dbGetArchivedChats()
      .then(setChats)
      .catch(() => toast.error('Could not load archived chats'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !viewingChat && !confirmDeleteId) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, viewingChat, confirmDeleteId]);

  const handleRestore = useCallback((chat: ChatSession) => {
    dbUnarchiveChat(chat.id)
      .then(() => {
        setChats(prev => prev.filter(c => c.id !== chat.id));
        toast.success(`"${chat.title}" restored`);
        onRestored();
      })
      .catch(() => toast.error('Could not restore chat'));
  }, [onRestored]);

  const handleDelete = useCallback((chat: ChatSession) => {
    dbDeleteChat(chat.id)
      .then(() => {
        setChats(prev => prev.filter(c => c.id !== chat.id));
        setConfirmDeleteId(null);
        toast.success('Conversation permanently deleted');
      })
      .catch(() => toast.error('Could not delete chat'));
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = chats
    .filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === 'title')    { return sortDir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title); }
      if (sortKey === 'messages') { av = a.messages.length; bv = b.messages.length; }
      if (sortKey === 'createdAt'){ av = chatCreatedAt(a); bv = chatCreatedAt(b); }
      if (sortKey === 'updatedAt'){ av = a.updatedAt; bv = b.updatedAt; }
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const SortBtn: React.FC<{ col: SortKey; label: string }> = ({ col, label }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 group hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
    >
      {label}
      <span className={`text-[10px] transition-opacity ${sortKey === col ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
        {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );

  if (!isOpen) return null;

  const confirmTarget = chats.find(c => c.id === confirmDeleteId);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-black/30 dark:bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-[151] flex items-center justify-center p-4 md:p-8 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col pointer-events-auto"
          style={{ maxHeight: 'calc(100vh - 4rem)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Archived Chats</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {chats.length} archived conversation{chats.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                placeholder="Search archived conversations…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
                <EmptyArchiveIcon size={48} />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {search ? 'No conversations match your search' : 'No archived conversations yet'}
                </p>
                {!search && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Archive a chat from the sidebar to see it here
                  </p>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50/90 dark:bg-gray-850/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
                  <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-6 py-3 w-[35%]">
                      <SortBtn col="title" label="Name" />
                    </th>
                    <th className="text-left px-4 py-3 w-[10%]">
                      <SortBtn col="messages" label="Messages" />
                    </th>
                    <th className="text-left px-4 py-3 w-[15%]">
                      <SortBtn col="createdAt" label="Created" />
                    </th>
                    <th className="text-left px-4 py-3 w-[20%]">
                      <SortBtn col="updatedAt" label="Last Message" />
                    </th>
                    <th className="text-right px-6 py-3 w-[20%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filtered.map(chat => {
                    const last = lastMessage(chat);
                    return (
                      <tr
                        key={chat.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                      >
                        {/* Name */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[240px]">
                            {chat.title}
                          </div>
                          {last && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[240px] mt-0.5">
                              {last.role === 'user' ? 'You: ' : 'AI: '}{last.content}
                            </div>
                          )}
                        </td>

                        {/* Message count */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium tabular-nums">
                            {chat.messages.length}
                          </span>
                        </td>

                        {/* Created */}
                        <td className="px-4 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(chatCreatedAt(chat))}
                        </td>

                        {/* Last message */}
                        <td className="px-4 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          <span title={last ? new Date(last.timestamp).toLocaleString() : undefined}>
                            {formatRelative(last?.timestamp ?? chat.updatedAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Read */}
                            <button
                              onClick={() => setViewingChat(chat)}
                              title="Read conversation"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                            >
                              <EyeIcon size={14} />
                              <span className="hidden sm:inline">Read</span>
                            </button>

                            {/* Restore */}
                            <button
                              onClick={() => handleRestore(chat)}
                              title="Restore to active chats"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <ArchiveRestoreIcon size={14} />
                              <span className="hidden sm:inline">Restore</span>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setConfirmDeleteId(chat.id)}
                              title="Permanently delete"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={14} />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Chat viewer modal */}
      {viewingChat && (
        <ChatViewer chat={viewingChat} onClose={() => setViewingChat(null)} />
      )}

      {/* Delete confirm dialog */}
      {confirmTarget && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-80 p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                  Permanently delete?
                </h3>
                <p className="mt-1 text-sm font-light text-gray-500 dark:text-gray-400 leading-relaxed">
                  "<span className="font-normal text-gray-700 dark:text-gray-300">{confirmTarget.title}</span>" cannot be recovered after deletion.
                </p>
              </div>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmTarget)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 transition-colors shadow-sm"
              >
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
