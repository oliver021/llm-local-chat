import React, { useState, useEffect, useCallback } from 'react';
import { Bookmark } from '../types';
import { X, Trash2 } from './Icons';
import { dbGetBookmarks, dbDeleteBookmark, dbUpdateBookmark } from '../utils/bookmarkApi';
import { toast } from 'sonner';

const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const EmptyIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

interface BookmarksPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({ isOpen, onClose }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    dbGetBookmarks()
      .then(setBookmarks)
      .catch(() => toast.error('Could not load bookmarks'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editingId && !confirmDeleteId) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, editingId, confirmDeleteId]);

  const handleDelete = useCallback((bookmark: Bookmark) => {
    dbDeleteBookmark(bookmark.id)
      .then(() => {
        setBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
        setConfirmDeleteId(null);
        toast.success('Bookmark deleted');
      })
      .catch(() => toast.error('Could not delete bookmark'));
  }, []);

  const handleSaveEdit = useCallback((bookmark: Bookmark) => {
    dbUpdateBookmark(bookmark.id, { title: editTitle, note: editNote })
      .then(() => {
        setBookmarks(prev => prev.map(b => b.id === bookmark.id ? { ...b, title: editTitle, note: editNote } : b));
        setEditingId(null);
        toast.success('Bookmark updated');
      })
      .catch(() => toast.error('Could not update bookmark'));
  }, [editTitle, editNote]);

  const filtered = bookmarks.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));
  const confirmTarget = bookmarks.find(b => b.id === confirmDeleteId);

  if (!isOpen) return null;

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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bookmarks</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
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
                placeholder="Search bookmarks…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
                <EmptyIcon size={48} />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {search ? 'No bookmarks match your search' : 'No bookmarks yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map(bookmark => (
                  <div
                    key={bookmark.id}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {editingId === bookmark.id ? (
                      <div className="flex flex-col gap-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Title"
                        />
                        <textarea
                          value={editNote}
                          onChange={e => setEditNote(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Note (optional)"
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(bookmark)}
                            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingId(bookmark.id);
                          setEditTitle(bookmark.title);
                          setEditNote(bookmark.note ?? '');
                        }}
                        className="cursor-pointer group"
                      >
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {bookmark.title}
                        </h3>
                        {bookmark.note && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{bookmark.note}</p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {new Date(bookmark.createdAt).toLocaleDateString()} · Chat: {bookmark.chatId}
                        </p>
                      </div>
                    )}
                    {editingId !== bookmark.id && (
                      <button
                        onClick={() => setConfirmDeleteId(bookmark.id)}
                        className="mt-2 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmTarget && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-80 p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Delete bookmark?</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                "<span className="font-normal text-gray-700 dark:text-gray-300">{confirmTarget.title}</span>" will be permanently removed.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmTarget)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
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
