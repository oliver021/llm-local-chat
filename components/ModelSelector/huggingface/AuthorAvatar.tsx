import { useState } from 'react';

export function AuthorAvatar({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (!src || failed) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
        {initial}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setFailed(true)}
      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800" />
  );
}
