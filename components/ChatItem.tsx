import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatSession } from '../types';
import { MessageSquare, Pin, MoreHorizontal, Pencil, Copy, Trash2, X } from './Icons';

// ── tiny icon for archive (not in Icons.tsx, inline svg) ──────────────────────
const ArchiveIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

interface ChatItemProps {
  chat: ChatSession;
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  activeChatId,
  onSelectChat,
  onTogglePin,
  onDeleteChat,
  onRenameChat,
}) => {
  const isActive = chat.id === activeChatId;

  // ── menu state ───────────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // ── rename state ─────────────────────────────────────────────────────────────
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── delete confirm state ─────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        menuBtnRef.current && !menuBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renaming) renameInputRef.current?.select();
  }, [renaming]);

  const startRename = useCallback(() => {
    setMenuOpen(false);
    setRenameValue(chat.title);
    setRenaming(true);
  }, [chat.title]);

  const commitRename = useCallback(() => {
    onRenameChat(chat.id, renameValue);
    setRenaming(false);
  }, [chat.id, renameValue, onRenameChat]);

  const cancelRename = useCallback(() => setRenaming(false), []);

  const handleRenameKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') cancelRename();
  }, [commitRename, cancelRename]);

  const confirmAndDelete = useCallback(() => {
    setConfirmDelete(false);
    onDeleteChat(chat.id);
  }, [chat.id, onDeleteChat]);

  return (
    <>
      <div
        onClick={() => !renaming && onSelectChat(chat.id)}
        className={`group relative flex items-center justify-between px-3 py-2 mx-2 rounded-xl cursor-pointer transition-all duration-200 ease-in-out
          ${
            isActive
              ? 'bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-400'
          }`}
      >
        {/* Active accent bar */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-blue-500 dark:bg-blue-400" />
        )}

        {/* Title / rename input */}
        <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
          <MessageSquare
            size={14}
            className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
          />
          {renaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKey}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-white dark:bg-gray-700 border border-blue-400 dark:border-blue-500 rounded-md px-2 py-0.5 text-sm text-gray-800 dark:text-gray-100 outline-none shadow-sm"
            />
          ) : (
            <span className="truncate text-sm font-light tracking-tight">{chat.title}</span>
          )}
        </div>

        {/* Action buttons — visible on hover or when active */}
        {!renaming && (
          <div className={`flex items-center gap-0.5 flex-shrink-0 transition-all duration-150
            ${isActive || menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {/* Pin button */}
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(chat.id); }}
              className={`p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                ${chat.isPinned ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}
              title={chat.isPinned ? 'Unpin' : 'Pin'}
              aria-label={chat.isPinned ? 'Unpin chat' : 'Pin chat'}
            >
              <Pin size={13} className={chat.isPinned ? 'fill-current' : ''} />
            </button>

            {/* Three-dot menu button */}
            <button
              ref={menuBtnRef}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              className={`p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 dark:text-gray-500
                ${menuOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : ''}`}
              title="More options"
              aria-label="More options"
            >
              <MoreHorizontal size={13} />
            </button>
          </div>
        )}

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-2 top-full mt-1 z-50 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden py-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Rename */}
            <button
              onClick={() => startRename()}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-light tracking-tight text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <Pencil size={13} className="text-gray-400" />
              Rename
            </button>

            {/* Copy — not implemented */}
            <button
              disabled
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-light tracking-tight text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
            >
              <Copy size={13} />
              Copy
            </button>

            {/* Archive — not implemented */}
            <button
              disabled
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-light tracking-tight text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
            >
              <ArchiveIcon size={13} />
              Archive
            </button>

            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

            {/* Delete */}
            <button
              onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-light tracking-tight text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-80 p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                  Delete conversation?
                </h3>
                <p className="mt-1 text-sm font-light text-gray-500 dark:text-gray-400 leading-relaxed">
                  "<span className="font-normal text-gray-700 dark:text-gray-300 truncate">{chat.title}</span>" will be permanently removed.
                </p>
              </div>
              <button
                onClick={() => setConfirmDelete(false)}
                className="mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
