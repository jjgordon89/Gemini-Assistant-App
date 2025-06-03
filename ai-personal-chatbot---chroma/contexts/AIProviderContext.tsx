import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AiProviderType } from '../types';
import { GoogleGenAI, Chat } from "@google/genai";
import { UserSettingsService, SettingName } from '../services';

interface AIProviderContextType {
  selectedProvider: AiProviderType;
  setSelectedProvider: (provider: AiProviderType) => void;
  apiKeys: Record<AiProviderType, string>;
  setApiKeys: React.Dispatch<React.SetStateAction<Record<AiProviderType, string>>>;
  handleApiKeyChange: (provider: AiProviderType, key: string) => void;
  geminiChat: Chat | null;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const defaultApiKeys: Record<AiProviderType, string> = {
  [AiProviderType.GEMINI]: process.env.API_KEY || "YOUR_GEMINI_API_KEY_HERE",
  [AiProviderType.OPENAI]: '',
  [AiProviderType.GROQ]: '',
  [AiProviderType.HUGGINGFACE]: '',
  [AiProviderType.OPENROUTER]: '',
};

const AIProviderContext = createContext<AIProviderContextType | undefined>(undefined);

export function AIProviderProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [selectedProvider, setSelectedProvider] = useState<AiProviderType>(AiProviderType.GEMINI);
  const [apiKeys, setApiKeys] = useState<Record<AiProviderType, string>>(defaultApiKeys);
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize Gemini chat when provider or API key changes
  useEffect(() => {
    if (selectedProvider === AiProviderType.GEMINI && apiKeys[AiProviderType.GEMINI] && apiKeys[AiProviderType.GEMINI] !== "YOUR_GEMINI_API_KEY_HERE") {
      try {
        const ai = new GoogleGenAI({ apiKey: apiKeys[AiProviderType.GEMINI] });
        const chatInstance = ai.chats.create({
          model: 'gemini-2.5-flash-preview-04-17',
          config: {
            systemInstruction: 'You are a helpful AI assistant with memory. You can recall past conversations when relevant. If asked about calendar or tasks, and the user is logged into Google, you can acknowledge that you *could* interact with their Google Calendar and Tasks. For now, provide helpful, general responses. For example, if asked to create an event, describe the event details you would create. If the user is not logged into Google, gently remind them they can connect their Google account for more features.',
          },
        });
        setGeminiChat(chatInstance);
        setError(null);
      } catch (e) {
        console.error("Failed to initialize Gemini chat:", e);
        setError("Failed to initialize Gemini. Please check your API key and console for details.");
        setGeminiChat(null);
      }
    } else if (selectedProvider === AiProviderType.GEMINI && (!apiKeys[AiProviderType.GEMINI] || apiKeys[AiProviderType.GEMINI] === "YOUR_GEMINI_API_KEY_HERE")) {
      setError("Gemini API Key not configured. Please set it in the sidebar or environment variables.");
      setGeminiChat(null);
    }
  }, [selectedProvider, apiKeys]);

  // Save settings to Supabase when they change and user is logged in
  useEffect(() => {
    if (userId) {
      saveApiSettings();
    }
  }, [selectedProvider, apiKeys, userId]);

  const saveApiSettings = async () => {
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
      
      console.log('API settings saved to Supabase');
    } catch (err) {
      console.error('Failed to save API settings to Supabase:', err);
      setError('Failed to save API settings. Changes may not persist between sessions.');
    }
  };

  const handleApiKeyChange = (provider: AiProviderType, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  const value = {
    selectedProvider,
    setSelectedProvider,
    apiKeys,
    setApiKeys,
    handleApiKeyChange,
    geminiChat,
    error,
    setError
  };

  return (
    <AIProviderContext.Provider value={value}>
      {children}
    </AIProviderContext.Provider>
  );
}

export function useAIProvider() {
  const context = useContext(AIProviderContext);
  if (context === undefined) {
    throw new Error('useAIProvider must be used within an AIProviderProvider');
  }
  return context;
}