import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { UserSettingsService, SettingName } from '../services';

interface SettingsContextType {
  theme: string;
  setTheme: (theme: string) => void;
  language: string;
  setLanguage: (language: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  memoryEnabled: boolean;
  setMemoryEnabled: (enabled: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  userSettingsLoaded: boolean;
  clearMemory: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ 
  children, 
  userId, 
  memoryService,
  onToggleMemory
}: { 
  children: ReactNode; 
  userId: string | null;
  memoryService: any;
  onToggleMemory?: (enabled: boolean) => void;
}) {
  const [theme, setTheme] = useState<string>('dark');
  const [language, setLanguage] = useState<string>('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [memoryEnabled, setMemoryEnabledState] = useState<boolean>(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [userSettingsLoaded, setUserSettingsLoaded] = useState(false);

  const setMemoryEnabled = (enabled: boolean) => {
    setMemoryEnabledState(enabled);
    if (onToggleMemory) {
      onToggleMemory(enabled);
    }
  };

  useEffect(() => {
    // Load settings when user logs in
    if (userId) {
      loadUserSettings();
    }
  }, [userId]);

  // Save settings to Supabase when they change and user is logged in
  useEffect(() => {
    if (userId && userSettingsLoaded) {
      saveUserSettings();
    }
  }, [theme, language, notificationsEnabled, memoryEnabled, userSettingsLoaded, userId]);

  const loadUserSettings = async () => {
    if (!userId) return;

    try {
      const userSettingsService = UserSettingsService.getInstance();
      const settings = await userSettingsService.getSettings(userId);
      
      // Process settings
      settings.forEach(setting => {
        switch (setting.setting_name) {
          case SettingName.THEME:
            setTheme(setting.setting_value);
            break;
          case SettingName.LANGUAGE:
            setLanguage(setting.setting_value);
            break;
          case SettingName.NOTIFICATION:
            setNotificationsEnabled(setting.setting_value === 'true');
            break;
          case SettingName.MEMORY_ENABLED:
            setMemoryEnabled(setting.setting_value === 'true');
            break;
        }
      });
      
      setUserSettingsLoaded(true);
      console.log('User settings loaded from Supabase');
    } catch (err) {
      console.error('Error loading user settings from Supabase:', err);
      // Continue with default settings
    }
  };

  const saveUserSettings = async () => {
    if (!userId) return;
    
    try {
      const userSettingsService = UserSettingsService.getInstance();
      
      // Prepare all settings for batch update
      const settingsToUpdate = {
        [SettingName.THEME]: theme,
        [SettingName.LANGUAGE]: language,
        [SettingName.NOTIFICATION]: String(notificationsEnabled),
        [SettingName.MEMORY_ENABLED]: String(memoryEnabled)
      };
      
      await userSettingsService.updateMultipleSettings(userId, settingsToUpdate);
      console.log('User settings saved to Supabase');
    } catch (err) {
      console.error('Failed to save user settings to Supabase:', err);
    }
  };

  const clearMemory = async () => {
    if (memoryService && userId) {
      try {
        const deletedCount = await memoryService.clearUserMemory();
        alert(`Cleared ${deletedCount} messages from memory.`);
        return Promise.resolve();
      } catch (err) {
        console.error("Failed to clear memory:", err);
        alert("Failed to clear memory. See console for details.");
        return Promise.reject(err);
      }
    } else {
      alert("Cannot clear memory: either memory service is not initialized or user is not logged in.");
      return Promise.reject(new Error("Memory service not initialized or user not logged in"));
    }
  };

  const value = {
    theme,
    setTheme,
    language,
    setLanguage,
    notificationsEnabled,
    setNotificationsEnabled,
    memoryEnabled,
    setMemoryEnabled,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    userSettingsLoaded,
    clearMemory
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}