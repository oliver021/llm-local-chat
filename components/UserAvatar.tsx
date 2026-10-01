import React from 'react';
import { User } from './Icons';
import { useSettingsContext } from '../context/SettingsContext';
import { getInitials } from '../utils/avatar';

/**
 * The user's avatar: initials from the display name on a gradient, or a generic
 * icon when no name is set. Fills its parent. Nothing is fetched from the network.
 */
export const UserAvatar: React.FC<{ className?: string }> = ({ className = 'text-xs' }) => {
  const { personalization } = useSettingsContext();
  const initials = getInitials(personalization.displayName);

  return (
    <div
      aria-hidden="true"
      className={`w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-400 to-cyan-500 text-white font-semibold select-none ${className}`}
    >
      {initials || <User size="1.25em" />}
    </div>
  );
};
