import React from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { UserAvatar } from '../UserAvatar';

export const ProfileTab: React.FC = () => {
  const { personalization } = useSettingsContext();
  const name = personalization.displayName.trim();

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Profile</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">How you appear in this app.</p>
      </div>

      <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 p-1 flex-shrink-0">
          <div className="w-full h-full rounded-full border-4 border-white dark:border-gray-850 overflow-hidden">
            <UserAvatar className="text-2xl" />
          </div>
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{name || 'Local user'}</h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {name ? 'Change your name under Personalization.' : 'Set your name under Personalization.'}
          </p>
        </div>
      </div>

      <div className="p-5 border border-gray-200 dark:border-gray-800 rounded-xl">
        <div className="font-medium text-gray-900 dark:text-white">Everything stays on your server</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Conversations are stored in the SQLite database of the server you run, and provider API
          keys never reach the browser. There are no accounts or subscriptions.
        </div>
      </div>
    </div>
  );
};
