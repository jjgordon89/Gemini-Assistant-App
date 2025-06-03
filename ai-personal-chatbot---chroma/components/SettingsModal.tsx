import React, { useState, useEffect } from 'react';
import { AiProviderType } from '../types';
import { UserSettingsService, SettingName } from '../services';
import { AlertTriangleIcon } from './icons/ChromaIcons';
import { useSettings } from '../contexts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  selectedProvider: AiProviderType;
  apiKeys: Record<AiProviderType, string>;
  memoryEnabled: boolean;
  onToggleMemory: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userId,
  selectedProvider,
  apiKeys,
  memoryEnabled,
  onToggleMemory
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme, language, setLanguage, notificationsEnabled, setNotificationsEnabled } = useSettings();
  
  const userSettingsService = UserSettingsService.getInstance();

  const saveSettings = async () => {
    if (!userId) {
      setError('You must be logged in to save settings');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prepare all settings for batch update
      const settingsToUpdate = {
        [SettingName.THEME]: theme,
        [SettingName.LANGUAGE]: language,
        [SettingName.NOTIFICATION]: String(notificationsEnabled),
        [SettingName.API_KEYS]: JSON.stringify(apiKeys),
        [SettingName.API_PROVIDER]: selectedProvider,
        [SettingName.MEMORY_ENABLED]: String(memoryEnabled)
      };
      
      await userSettingsService.updateMultipleSettings(userId, settingsToUpdate);
      onClose();
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-purple-900/50 rounded-xl shadow-lg p-6 glassmorphism">
        <h2 className="text-xl font-bold mb-4 text-white">Settings</h2>
        
        {error && (
          <div className="p-3 mb-4 bg-red-800/50 border border-red-700 text-red-200 rounded-lg text-sm">
            <AlertTriangleIcon className="inline w-5 h-5 mr-2" />
            {error}
          </div>
        )}
        
        {!userId && (
          <div className="p-3 mb-4 bg-yellow-800/30 border border-yellow-700 text-yellow-200 rounded-lg text-sm">
            <AlertTriangleIcon className="inline w-5 h-5 mr-2" />
            Sign in with Google to save your settings across sessions.
          </div>
        )}
        
        <div className="space-y-4">
          {/* Theme Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full p-2 bg-gray-800/70 border border-purple-700/60 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white"
              disabled={isLoading}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          
          {/* Language Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2 bg-gray-800/70 border border-purple-700/60 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white"
              disabled={isLoading}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          
          {/* Notifications Setting */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifications"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
              disabled={isLoading}
            />
            <label htmlFor="notifications" className="ml-2 text-sm font-medium text-gray-300">
              Enable Notifications
            </label>
          </div>
          
          {/* Memory Setting */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="memory"
              checked={memoryEnabled}
              onChange={(e) => onToggleMemory(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
              disabled={isLoading}
            />
            <label htmlFor="memory" className="ml-2 text-sm font-medium text-gray-300">
              Enable Conversation Memory
            </label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            className="px-4 py-2 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;