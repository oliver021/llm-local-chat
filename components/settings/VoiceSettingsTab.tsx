import React from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { SettingToggle } from '../SettingToggle';
import { TTSProvider, STTProvider } from '../../types';

const TTS_PROVIDERS: { value: TTSProvider; label: string }[] = [
  { value: 'browser', label: 'Browser (built-in)' },
  { value: 'openai-tts', label: 'OpenAI TTS' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
];

const STT_PROVIDERS: { value: STTProvider; label: string }[] = [
  { value: 'browser', label: 'Browser (built-in)' },
  { value: 'whisper', label: 'OpenAI Whisper' },
];

const MOCK_VOICES = ['Alloy', 'Echo', 'Fable', 'Onyx', 'Nova', 'Shimmer'];

export const VoiceSettingsTab: React.FC = () => {
  const { voiceSettings, updateVoiceSettings } = useSettingsContext();

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Voice Settings</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Configure text-to-speech and speech-to-text behaviour.</p>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Text-to-Speech</h4>
        <SettingToggle
          label="Enable TTS"
          description="Read assistant responses aloud."
          checked={voiceSettings.ttsEnabled}
          onToggle={() => updateVoiceSettings({ ttsEnabled: !voiceSettings.ttsEnabled })}
        />
        {voiceSettings.ttsEnabled && (
          <div className="space-y-3 pl-1">
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Provider</label>
              <select
                value={voiceSettings.ttsProvider}
                onChange={e => updateVoiceSettings({ ttsProvider: e.target.value as TTSProvider })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TTS_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Voice</label>
              <select
                value={voiceSettings.selectedVoice}
                onChange={e => updateVoiceSettings({ selectedVoice: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MOCK_VOICES.map(v => <option key={v} value={v.toLowerCase()}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Speed: {voiceSettings.speed.toFixed(1)}×</label>
              <input type="range" min="0.5" max="2.0" step="0.1" value={voiceSettings.speed} onChange={e => updateVoiceSettings({ speed: parseFloat(e.target.value) })} className="w-full accent-blue-500" />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Speech-to-Text</h4>
        <SettingToggle
          label="Enable STT"
          description="Dictate messages using your microphone."
          checked={voiceSettings.sttEnabled}
          onToggle={() => updateVoiceSettings({ sttEnabled: !voiceSettings.sttEnabled })}
        />
        {voiceSettings.sttEnabled && (
          <div className="space-y-1 pl-1">
            <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Provider</label>
            <select
              value={voiceSettings.sttProvider}
              onChange={e => updateVoiceSettings({ sttProvider: e.target.value as STTProvider })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STT_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {(voiceSettings.ttsProvider !== 'browser' || voiceSettings.sttProvider === 'whisper') && (voiceSettings.ttsEnabled || voiceSettings.sttEnabled) && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">API Key</h4>
          <input
            type="password"
            value={voiceSettings.apiKey}
            onChange={e => updateVoiceSettings({ apiKey: e.target.value })}
            placeholder="OpenAI or ElevenLabs API key"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">Stored locally in your browser only.</p>
        </div>
      )}
    </div>
  );
};
