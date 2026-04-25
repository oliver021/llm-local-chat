import React, { useState } from 'react';
import { X, User, Palette, Shield, Sparkles } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'account' | 'appearance' | 'privacy';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('account');

  if (!isOpen) return null;

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Modal Container */}
      <div className="w-full max-w-5xl h-[85vh] max-h-[800px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex overflow-hidden animate-fade-in-up relative border border-gray-200 dark:border-gray-800">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Left Sidebar */}
        <div className="w-64 bg-gray-50/50 dark:bg-gray-950/50 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 px-2">Settings</h2>
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                    isActive 
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 border border-transparent'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-white dark:bg-gray-900">
          <div className="max-w-2xl">
            {activeTab === 'account' && (
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
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8 animate-fade-in-up">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Appearance</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Customize how Aura looks on your device.</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Theme</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {['System', 'Light', 'Dark'].map((t) => (
                      <button key={t} className={`p-4 rounded-xl border-2 text-left transition-all ${t === 'Dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}>
                        <div className="font-medium text-gray-900 dark:text-white mb-1">{t}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Use {t.toLowerCase()} theme</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Chat Density</h4>
                  <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">Compact Mode</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Reduce spacing between messages</div>
                    </div>
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-8 animate-fade-in-up">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Privacy & Security</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Control your data and privacy preferences.</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Data Controls</h4>
                  
                  <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">Improve the model for everyone</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Allow your content to be used to train our models.</div>
                    </div>
                    <div className="w-11 h-6 bg-blue-500 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">Chat History</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Save new chats to your history.</div>
                    </div>
                    <div className="w-11 h-6 bg-blue-500 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Danger Zone</h4>
                  <button className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    Clear all chat history
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
