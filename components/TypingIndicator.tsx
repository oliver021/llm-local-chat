import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex gap-2 p-4">
      <div className="text-gray-600 dark:text-gray-400 text-sm">
        <span className="font-semibold">Aura</span> is thinking
      </div>
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  );
};
