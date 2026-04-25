import React from 'react';
import { Copy, Pencil, Trash2, RefreshCw } from './Icons';

interface MessageActionMenuProps {
  messageId: string;
  chatId: string;
  isAIMessage: boolean;
  onCopy: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete: (chatId: string, messageId: string) => void;
  onRegenerate: (chatId: string, messageId: string) => void;
}

export const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
  messageId,
  chatId,
  isAIMessage,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
}) => {
  return (
    <div className="flex gap-1 items-center">
      {/* Copy button */}
      <button
        onClick={() => onCopy(messageId)}
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        title="Copy message"
        aria-label="Copy message"
        type="button"
      >
        <Copy size={14} />
      </button>

      {/* Edit button (user messages only) */}
      {!isAIMessage && onEdit && (
        <button
          onClick={() => onEdit(messageId)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          title="Edit message"
          aria-label="Edit message"
          type="button"
        >
          <Pencil size={14} />
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(chatId, messageId)}
        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-500 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        title="Delete message"
        aria-label="Delete message"
        type="button"
      >
        <Trash2 size={14} />
      </button>

      {/* Regenerate button (AI messages only) */}
      {isAIMessage && (
        <button
          onClick={() => onRegenerate(chatId, messageId)}
          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-gray-500 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="Regenerate response"
          aria-label="Regenerate response"
          type="button"
        >
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
};
