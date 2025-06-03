import { useState, useEffect } from 'react';
import { AiProviderType } from '../types';
import { GoogleGenAI, Chat } from "@google/genai";
import { UserSettingsService, SettingName } from '../services';
import { allTools } from '../../../toolSchemas'; // Import tool schemas

/**
 * Default API keys with environment API key for Gemini
 */
const getDefaultApiKeys = (): Record<AiProviderType, string> => ({
  [AiProviderType.GEMINI]: process.env.API_KEY || "YOUR_GEMINI_API_KEY_HERE",
  [AiProviderType.OPENAI]: '',
  [AiProviderType.GROQ]: '',
  [AiProviderType.HUGGINGFACE]: '',
  [AiProviderType.OPENROUTER]: '',
});

/**
 * Custom hook to manage AI provider selection and API keys
 * @param userId User ID for saving settings
 * @returns AI provider state and methods
 */
export function useAIProvider(userId: string | null) {
  const [selectedProvider, setSelectedProvider] = useState<AiProviderType>(AiProviderType.GEMINI);
  const [apiKeys, setApiKeys] = useState<Record<AiProviderType, string>>(getDefaultApiKeys());
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Initialize Gemini chat when provider or API key changes
  useEffect(() => {
    initializeGeminiChat();
  }, [selectedProvider, apiKeys]);

  // Load AI provider settings when user ID changes
  useEffect(() => {
    if (userId) {
      loadAISettings();
    } else {
      // Reset to defaults when user logs out
      resetToDefaults();
    }
  }, [userId]);

  // Save settings to Supabase when they change and user is logged in
  useEffect(() => {
    if (userId && isSettingsLoaded) {
      saveAISettings();
    }
  }, [selectedProvider, apiKeys, isSettingsLoaded, userId]);

  /**
   * Initialize the Gemini chat instance
   */
  const initializeGeminiChat = () => {
    if (selectedProvider === AiProviderType.GEMINI && 
        apiKeys[AiProviderType.GEMINI] && 
        apiKeys[AiProviderType.GEMINI] !== "YOUR_GEMINI_API_KEY_HERE") {
      try {
        const ai = new GoogleGenAI({ apiKey: apiKeys[AiProviderType.GEMINI] });
        const chatInstance = ai.chats.create({
          model: 'gemini-2.5-flash-preview-04-17',
          config: {
            systemInstruction: 'You are a helpful AI assistant with memory. You can recall past conversations when relevant. If asked about calendar or tasks, and the user is logged into Google, you can acknowledge that you *could* interact with their Google Calendar and Tasks. For now, provide helpful, general responses. For example, if asked to create an event, describe the event details you would create. If the user is not logged into Google, gently remind them they can connect their Google account for more features.',
          },
          tools: allTools, // Add this line
        });
        setGeminiChat(chatInstance);
        setError(null);
      } catch (e) {
        console.error("Failed to initialize Gemini chat:", e);
        setError("Failed to initialize Gemini. Please check your API key and console for details.");
        setGeminiChat(null);
      }
    } else if (selectedProvider === AiProviderType.GEMINI && 
              (!apiKeys[AiProviderType.GEMINI] || apiKeys[AiProviderType.GEMINI] === "YOUR_GEMINI_API_KEY_HERE")) {
      setError("Gemini API Key not configured. Please set it in the sidebar or environment variables.");
      setGeminiChat(null);
    }
  };

  /**
   * Load AI provider settings from Supabase
   */
  const loadAISettings = async () => {
    if (!userId) return;
    
    try {
      const userSettingsService = UserSettingsService.getInstance();
      const settings = await userSettingsService.getSettings(userId);
      
      let newApiKeys = {...apiKeys};
      let newProvider = selectedProvider;
      
      // Process settings
      settings.forEach(setting => {
        switch (setting.setting_name) {
          case SettingName.API_KEYS:
            try {
              const storedApiKeys = JSON.parse(setting.setting_value);
              // Update only keys that are in the parsed object
              Object.keys(storedApiKeys).forEach(key => {
                if (key in apiKeys) {
                  newApiKeys[key as AiProviderType] = storedApiKeys[key];
                }
              });
            } catch (e) {
              console.error('Error parsing API keys from settings:', e);
            }
            break;
          case SettingName.API_PROVIDER:
            newProvider = setting.setting_value as AiProviderType;
            break;
        }
      });
      
      setApiKeys(newApiKeys);
      setSelectedProvider(newProvider);
      setIsSettingsLoaded(true);
      
      console.log('AI provider settings loaded from Supabase');
    } catch (err) {
      console.error('Error loading AI provider settings from Supabase:', err);
      // Continue with default settings
    }
  };

  /**
   * Save AI provider settings to Supabase
   */
  const saveAISettings = async () => {
    if (!userId) return;
    
    try {
      const userSettingsService = UserSettingsService.getInstance();
      
      // Save API provider and keys
      await userSettingsService.updateSetting(
        userId,
        SettingName.API_PROVIDER,
        selectedProvider
      );
      
      await userSettingsService.updateSetting(
        userId,
        SettingName.API_KEYS,
        JSON.stringify(apiKeys)
      );
      
      console.log('AI provider settings saved to Supabase');
    } catch (err) {
      console.error('Failed to save AI provider settings to Supabase:', err);
      setError('Failed to save API settings. Changes may not persist between sessions.');
    }
  };

  /**
   * Reset to default settings
   */
  const resetToDefaults = () => {
    setSelectedProvider(AiProviderType.GEMINI);
    setApiKeys(getDefaultApiKeys());
    setIsSettingsLoaded(false);
  };

  /**
   * Update an API key
   */
  const handleApiKeyChange = (provider: AiProviderType, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  return {
    selectedProvider,
    setSelectedProvider,
    apiKeys,
    setApiKeys,
    handleApiKeyChange,
    geminiChat,
    error,
    setError
  };
}