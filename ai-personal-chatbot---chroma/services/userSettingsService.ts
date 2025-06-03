import SupabaseService from './supabaseService';
import { SupabaseClient } from '@supabase/supabase-js';

// Define the schema for user settings
export interface UserSetting {
  id?: string;
  user_id: string;
  setting_name: string;
  setting_value: string;
  created_at?: string;
  updated_at?: string;
}

// Define common setting names to prevent typos
export enum SettingName {
  THEME = 'theme',
  LANGUAGE = 'language',
  API_PROVIDER = 'api_provider',
  NOTIFICATION = 'notification_preference',
  MEMORY_ENABLED = 'memory_enabled',
  API_KEYS = 'api_keys'
}

class UserSettingsService {
  private static instance: UserSettingsService;
  private supabase: SupabaseClient;
  private tableName = 'user_settings';
  
  private constructor() {
    const supabaseService = SupabaseService.getInstance();
    this.supabase = supabaseService.getClient();
  }

  public static getInstance(): UserSettingsService {
    if (!UserSettingsService.instance) {
      UserSettingsService.instance = new UserSettingsService();
    }
    return UserSettingsService.instance;
  }

  /**
   * Get all settings for a user
   * @param userId The user's ID (usually email for Google auth)
   * @returns Array of user settings
   */
  public async getSettings(userId: string): Promise<UserSetting[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
  }

  /**
   * Get a specific setting for a user
   * @param userId The user's ID
   * @param settingName The name of the setting to retrieve
   * @returns The setting value or null if not found
   */
  public async getSetting(userId: string, settingName: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('setting_value')
        .eq('user_id', userId)
        .eq('setting_name', settingName)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned, setting doesn't exist
          return null;
        }
        throw error;
      }
      
      return data?.setting_value || null;
    } catch (error) {
      console.error(`Error fetching setting "${settingName}":`, error);
      throw error;
    }
  }

  /**
   * Update or insert a user setting
   * @param userId The user's ID
   * @param settingName The name of the setting
   * @param settingValue The value to store
   * @returns The updated or inserted setting
   */
  public async updateSetting(userId: string, settingName: string, settingValue: string): Promise<UserSetting> {
    try {
      // Check if we need to stringify objects
      const valueToStore = typeof settingValue === 'object' 
        ? JSON.stringify(settingValue) 
        : String(settingValue);
      
      const now = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert({
          user_id: userId,
          setting_name: settingName,
          setting_value: valueToStore,
          updated_at: now
        }, {
          onConflict: 'user_id, setting_name',
          returning: 'representation'
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Error updating setting "${settingName}":`, error);
      throw error;
    }
  }

  /**
   * Update multiple settings at once
   * @param userId The user's ID
   * @param settings Object with setting names as keys and values to store
   * @returns True if successful
   */
  public async updateMultipleSettings(
    userId: string, 
    settings: Record<string, string | object>
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      
      // Prepare all settings for upsert
      const settingsToUpsert = Object.entries(settings).map(([name, value]) => ({
        user_id: userId,
        setting_name: name,
        setting_value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        updated_at: now
      }));
      
      const { error } = await this.supabase
        .from(this.tableName)
        .upsert(settingsToUpsert, {
          onConflict: 'user_id, setting_name'
        });
        
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating multiple settings:', error);
      throw error;
    }
  }

  /**
   * Delete a specific setting
   * @param userId The user's ID
   * @param settingName The name of the setting to delete
   * @returns True if successful
   */
  public async deleteSetting(userId: string, settingName: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId)
        .eq('setting_name', settingName);
        
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting setting "${settingName}":`, error);
      throw error;
    }
  }

  /**
   * Delete all settings for a user
   * @param userId The user's ID
   * @returns True if successful
   */
  public async deleteAllSettings(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId);
        
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting all user settings:', error);
      throw error;
    }
  }
}

export default UserSettingsService;