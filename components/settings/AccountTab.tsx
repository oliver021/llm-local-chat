import React from 'react';
import { Sparkles } from '../Icons';

export const AccountTab: React.FC = () => (
  <div className="space-y-8 animate-fade-in-up">
    <div>
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Account Profile</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your personal information and subscription.</p>
    </div>

    <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800">
      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 p-1">
        <div className="w-full h-full rounded-full border-4 border-white dark:border-gray-850 overflow-hidden">
          <img src="https://picsum.photos/200/200?random=1" alt="User" className="w-full h-full object-cover" />
        </div>
      </div>
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Alex Developer</h4>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">alex@example.com</p>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold">
          <Sparkles size={12} />
          Aura Pro
        </div>
      </div>
      <button className="ml-auto px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        Edit Profile
      </button>
    </div>

    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Subscription</h4>
      <div className="p-5 border border-gray-200 dark:border-gray-800 rounded-xl flex justify-between items-center">
        <div>
          <div className="font-medium text-gray-900 dark:text-white">Pro Plan</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">$20/month • Renews on Oct 15, 2024</div>
        </div>
        <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
          Manage Billing
        </button>
      </div>
    </div>
  </div>
);
