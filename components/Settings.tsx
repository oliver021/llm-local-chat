import React, { useState, useRef } from 'react';
import { X, User, Palette, Sparkles, Globe, Cpu, Mic, Bot } from './Icons';
import { useFocusTrap } from '../utils/focusTrap';
import { AccountTab } from './settings/AccountTab';
import { AppearanceTab } from './settings/AppearanceTab';
import { PersonalizationTab } from './settings/PersonalizationTab';
import { WebSearchTab } from './settings/WebSearchTab';
import { MCPTab } from './settings/MCPTab';
import { VoiceSettingsTab } from './settings/VoiceSettingsTab';
import { AssistantManagerTab } from './settings/AssistantManagerTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'account' | 'appearance' | 'personalization' | 'webSearch' | 'mcp' | 'voice' | 'assistants';

const TABS = [
  { id: 'account'         as const, label: 'Account',         icon: User      },
  { id: 'appearance'      as const, label: 'Appearance',       icon: Palette   },
  { id: 'personalization' as const, label: 'Personalization',  icon: Sparkles  },
  { id: 'webSearch'       as const, label: 'Web Search',       icon: Globe     },
  { id: 'mcp'             as const, label: 'MCP',              icon: Cpu       },
  { id: 'voice'           as const, label: 'Voice',            icon: Mic       },
  { id: 'assistants'      as const, label: 'Assistants',       icon: Bot       },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('account');

  useFocusTrap(modalRef as React.RefObject<HTMLElement>);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity">
      <div ref={modalRef} className="w-full max-w-5xl h-[85vh] max-h-[800px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex overflow-hidden animate-fade-in-up relative border border-gray-200 dark:border-gray-800">

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Left Sidebar */}
        <div className="w-64 bg-gray-50/50 dark:bg-gray-950/50 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 px-2">Settings</h2>
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => {
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
            {activeTab === 'account'         && <AccountTab />}
            {activeTab === 'appearance'      && <AppearanceTab />}
            {activeTab === 'personalization' && <PersonalizationTab />}
            {activeTab === 'webSearch'       && <WebSearchTab />}
            {activeTab === 'mcp'             && <MCPTab />}
            {activeTab === 'voice'           && <VoiceSettingsTab />}
            {activeTab === 'assistants'      && <AssistantManagerTab />}
          </div>
        </div>
      </div>
    </div>
  );
};
