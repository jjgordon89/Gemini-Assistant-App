import React, { createContext, useState, ReactNode, useCallback } from 'react';
import { AiProviderType, Persona } from '../types';

interface ApiKeysState {
  [AiProviderType.GEMINI]: string;
  [AiProviderType.OPENAI]: string;
  [AiProviderType.GROQ]: string;
  [AiProviderType.HUGGINGFACE]: string;
  [AiProviderType.OPENROUTER]: string;
}

interface SettingsContextType {
  apiKeys: ApiKeysState;
  selectedProvider: AiProviderType;
  personas: Persona[];
  selectedPersonaName: string;
  customSystemPrompt: string;
  handleApiKeyChange: (provider: AiProviderType, key: string) => void;
  setSelectedProvider: (provider: AiProviderType) => void;
  handleSelectPersona: (name: string) => void;
  handleCustomSystemPromptChange: (prompt: string) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
  defaultPersonas: Persona[];
  initialGeminiKey: string;
  // Allow initial selection to be passed, otherwise use first default persona
  initialSelectedPersonaName?: string;
  initialCustomSystemPrompt?: string;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  defaultPersonas,
  initialGeminiKey,
  initialSelectedPersonaName,
  initialCustomSystemPrompt
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKeysState>({
    [AiProviderType.GEMINI]: initialGeminiKey,
    [AiProviderType.OPENAI]: '',
    [AiProviderType.GROQ]: '',
    [AiProviderType.HUGGINGFACE]: '',
    [AiProviderType.OPENROUTER]: '',
  });
  const [selectedProvider, setSelectedProvider] = useState<AiProviderType>(AiProviderType.GEMINI);
  const [personas] = useState<Persona[]>(defaultPersonas); // Personas are static for now
  const [selectedPersonaName, setSelectedPersonaName] = useState<string>(
    initialSelectedPersonaName || (defaultPersonas.length > 0 ? defaultPersonas[0].name : 'Custom')
  );
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(
    initialCustomSystemPrompt || 'You are a helpful AI. Behave as I instruct.'
  );

  const handleApiKeyChange = useCallback((provider: AiProviderType, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  }, []);

  const handleSelectPersona = useCallback((name: string) => {
    setSelectedPersonaName(name);
  }, []);

  const handleCustomSystemPromptChange = useCallback((prompt: string) => {
    setCustomSystemPrompt(prompt);
  }, []);

  return (
    <SettingsContext.Provider value={{
      apiKeys,
      selectedProvider,
      personas,
      selectedPersonaName,
      customSystemPrompt,
      handleApiKeyChange,
      setSelectedProvider, // Directly pass the setter
      handleSelectPersona,
      handleCustomSystemPromptChange
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
