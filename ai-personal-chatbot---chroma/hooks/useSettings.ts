import { useState, useEffect } from 'react';
import { UserSettingsService, SettingName } from '../services';

/**
 * Custom hook to manage user settings
 * @param userId The user's ID (usually email for Google auth)
 * @returns Settings state and methods to update them
 */
export function useUserSettings(userId: string | null) {
  const [theme, setTheme] = useState<string>('dark');
  const [language, setLanguage] = useState<string>('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  useEffect(() => {
    // Load settings when user ID changes (login/logout)
    if (userId) {
      loadUserSettings();
    } else {
      // Reset to defaults when user logs out
      resetToDefaults();
    }
  }, [userId]);

  // Save settings to Supabase when they change and user is logged in
  useEffect(() => {
    if (userId && isSettingsLoaded) {
      saveUserSettings();
    }
  }, [theme, language, notificationsEnabled, memoryEnabled, isSettingsLoaded, userId]);

  const loadUserSettings = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);

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
      
      setIsSettingsLoaded(true);
      console.log('User settings loaded from Supabase');
    } catch (err) {
      console.error('Error loading user settings from Supabase:', err);
      setError('Failed to load settings. Using defaults.');
      // Continue with default settings
    } finally {
      setIsLoading(false);
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
      setError('Failed to save settings. Changes may not persist between sessions.');
    }
  };

  const resetToDefaults = () => {
    setTheme('dark');
    setLanguage('en');
    setNotificationsEnabled(false);
    setMemoryEnabled(true);
    setIsSettingsLoaded(false);
  };

  return {
    theme, setTheme,
    language, setLanguage,
    notificationsEnabled, setNotificationsEnabled,
    memoryEnabled, setMemoryEnabled,
    isLoading, error,
    isSettingsLoaded
  };
}