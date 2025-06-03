import React, { useState } from 'react';
import { AiProviderType, GoogleUserProfile } from '../types';
import { SettingsIcon, GoogleIcon, ChevronDownIcon, ChevronUpIcon, KeyIcon, CalendarIcon, TasksIcon, GeminiLogoIcon, OpenAILogoIcon, GroqLogoIcon, HFLogoIcon, OpenRouterLogoIcon, UserCircleIcon, AlertTriangleIcon } from './icons/ChromaIcons';

interface SidebarProps {
  selectedProvider: AiProviderType;
  apiKeys: Record<AiProviderType, string>;
  onApiKeyChange: (provider: AiProviderType, key: string) => void;
  isGoogleLoggedIn: boolean;
  googleUserProfile: GoogleUserProfile | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  isGoogleClientConfigured: boolean;
  onClearMemory?: () => void;
  memoryEnabled: boolean;
  onOpenSettings?: () => void;
}

const providerIcons: Record<AiProviderType, React.FC<{className?: string}>> = {
    [AiProviderType.GEMINI]: GeminiLogoIcon,
    [AiProviderType.OPENAI]: OpenAILogoIcon,
    [AiProviderType.GROQ]: GroqLogoIcon,
    [AiProviderType.HUGGINGFACE]: HFLogoIcon,
    [AiProviderType.OPENROUTER]: OpenRouterLogoIcon,
};

export const Sidebar: React.FC<SidebarProps> = ({
  selectedProvider,
  apiKeys,
  onApiKeyChange,
  isGoogleLoggedIn,
  googleUserProfile,
  onGoogleLogin,
  onGoogleLogout,
  isGoogleClientConfigured,
  onClearMemory,
  memoryEnabled,
  onOpenSettings
}) => {
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showGoogleIntegrations, setShowGoogleIntegrations] = useState(true);
  const [showMemory, setShowMemory] = useState(true);

  const currentApiKey = apiKeys[selectedProvider];

  return (
    <aside className="w-72 bg-black/50 backdrop-blur-md p-5 border-r border-purple-900/30 flex flex-col space-y-6 scrollbar-thin overflow-y-auto">
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Provider</h2>
        <div className="relative">
          <select
            value={selectedProvider}
            className="w-full p-3 bg-gray-800/70 border border-purple-700/60 rounded-lg appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white placeholder-gray-400 transition-colors"
          >
            {Object.values(AiProviderType).map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
        </div>
        {providerIcons[selectedProvider] && React.createElement(providerIcons[selectedProvider], {className: "w-8 h-8 mx-auto my-3 text-gray-300"})}
      </div>

      <div>
        <button
            onClick={() => setShowApiKeys(!showApiKeys)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 hover:text-purple-400 transition-colors"
        >
            API Key Configuration
            {showApiKeys ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        {showApiKeys && (
            <div className="mt-2 space-y-2">
                <label htmlFor="apiKeyInput" className="text-sm text-gray-300 block mb-1">
                    API Key for {selectedProvider}
                </label>
                <div className="relative">
                    <KeyIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"/>
                    <input
                        id="apiKeyInput"
                        type="password"
                        placeholder={`Enter ${selectedProvider} API Key`}
                        value={currentApiKey === "YOUR_GEMINI_API_KEY_HERE" && selectedProvider === AiProviderType.GEMINI ? "" : currentApiKey}
                        onChange={(e) => onApiKeyChange(selectedProvider, e.target.value)}
                        className="w-full p-3 pl-10 bg-gray-800/70 border border-purple-700/60 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white placeholder-gray-500 transition-colors"
                    />
                </div>
                {/* Removed the confusing paragraph about environment variables */}
                {currentApiKey === "YOUR_GEMINI_API_KEY_HERE" && selectedProvider === AiProviderType.GEMINI && (
                    <p className="text-xs text-yellow-500 mt-1">
                        <AlertTriangleIcon className="inline w-3 h-3 mr-1" />
                        Gemini API key is a placeholder. Update it for full functionality.
                    </p>
                )}
                {selectedProvider !== AiProviderType.GEMINI && (
                     <p className="text-xs text-yellow-400/80 mt-1">Note: Only Gemini is fully implemented in this version.</p>
                )}
            </div>
        )}
      </div>
      
      <div className="border-t border-purple-900/30 pt-6">
        <button
            onClick={() => setShowGoogleIntegrations(!showGoogleIntegrations)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-purple-400 transition-colors"
        >
            Google Integrations
            {showGoogleIntegrations ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        {showGoogleIntegrations && (
            <div className="space-y-3">
            {!isGoogleClientConfigured && (
                <div className="p-3 bg-yellow-800/30 border border-yellow-700 text-yellow-200 rounded-lg text-sm">
                    <AlertTriangleIcon className="inline w-5 h-5 mr-2" />
                    Google Client ID not configured. Google integrations are disabled.
                </div>
            )}
            {isGoogleLoggedIn && googleUserProfile && (
                <div className="p-3 rounded-lg glassmorphism border-green-500/50 border flex items-center space-x-3">
                    {googleUserProfile.picture ? (
                        <img src={googleUserProfile.picture} alt="User" className="w-10 h-10 rounded-full" />
                    ) : (
                        <UserCircleIcon className="w-10 h-10 text-gray-400" />
                    )}
                    <div>
                        <p className="text-sm font-medium text-gray-100">{googleUserProfile.name}</p>
                        <p className="text-xs text-gray-400">{googleUserProfile.email}</p>
                    </div>
                </div>
            )}
            <button
                onClick={isGoogleLoggedIn ? onGoogleLogout : onGoogleLogin}
                disabled={!isGoogleClientConfigured}
                className={`w-full flex items-center justify-center p-3 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                ${isGoogleLoggedIn 
                    ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500' 
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white focus:ring-blue-500'}
                ${!isGoogleClientConfigured ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <GoogleIcon className="w-5 h-5 mr-2" />
                {isGoogleLoggedIn ? 'Disconnect Google' : 'Connect Google Account'}
            </button>
            <div className={`p-3 rounded-lg glassmorphism ${isGoogleLoggedIn ? 'border-green-500/50' : 'border-gray-700/50'} border`}>
                <div className="flex items-center text-sm">
                <CalendarIcon className={`w-5 h-5 mr-2 ${isGoogleLoggedIn ? 'text-green-400' : 'text-gray-500'}`} />
                <span className={`${isGoogleLoggedIn ? 'text-gray-200' : 'text-gray-500'}`}>Google Calendar</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isGoogleLoggedIn ? 'bg-green-500/30 text-green-300' : 'bg-gray-600/50 text-gray-400'}`}>
                    {isGoogleLoggedIn ? 'Active' : 'Disabled'}
                </span>
                </div>
            </div>
            <div className={`p-3 rounded-lg glassmorphism ${isGoogleLoggedIn ? 'border-green-500/50' : 'border-gray-700/50'} border`}>
                <div className="flex items-center text-sm">
                <TasksIcon className={`w-5 h-5 mr-2 ${isGoogleLoggedIn ? 'text-green-400' : 'text-gray-500'}`} />
                <span className={`${isGoogleLoggedIn ? 'text-gray-200' : 'text-gray-500'}`}>Google Tasks</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isGoogleLoggedIn ? 'bg-green-500/30 text-green-300' : 'bg-gray-600/50 text-gray-400'}`}>
                    {isGoogleLoggedIn ? 'Active' : 'Disabled'}
                </span>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
                {isGoogleClientConfigured ? 
                    (isGoogleLoggedIn ? "Chatbot can now access your Google services." : "Connect to enable Google service interactions.")
                    : "Google integration is disabled due to missing configuration."
                }
            </p>
            </div>
        )}
      </div>

      {/* Memory Section */}
      <div className="border-t border-purple-900/30 pt-6">
        <button
            onClick={() => setShowMemory(!showMemory)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-purple-400 transition-colors"
        >
            Conversation Memory
            {showMemory ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        {showMemory && (
            <div className="space-y-3">
                <div className={`p-3 rounded-lg glassmorphism ${memoryEnabled ? 'border-purple-500/50' : 'border-gray-700/50'} border`}>
                    <div className="flex items-center text-sm">
                        <span className={`${memoryEnabled ? 'text-gray-200' : 'text-gray-500'}`}>AI Memory System</span>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${memoryEnabled ? 'bg-purple-500/30 text-purple-300' : 'bg-gray-600/50 text-gray-400'}`}>
                            {memoryEnabled ? 'Active' : 'Disabled'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Enables the AI to remember past conversations and provide contextually relevant responses.
                    </p>
                </div>
                
                {isGoogleLoggedIn && memoryEnabled && onClearMemory && (
                    <button
                        onClick={onClearMemory}
                        className="w-full p-2 bg-red-900/30 border border-red-700/60 rounded-lg text-sm text-red-200 hover:bg-red-900/50 transition-colors"
                    >
                        Clear My Conversation Memory
                    </button>
                )}
                
                {!isGoogleLoggedIn && memoryEnabled && (
                    <p className="text-xs text-yellow-400">
                        <AlertTriangleIcon className="inline w-4 h-4 mr-1" />
                        Sign in with Google to enable personalized memory.
                    </p>
                )}
            </div>
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-purple-900/30">
        <div 
          onClick={onOpenSettings}
          className="flex items-center space-x-2 text-gray-500 hover:text-purple-400 transition-colors cursor-pointer"
        >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-sm">Settings</span>
        </div>
        <p className="text-xs text-gray-600 mt-4">Chroma AI v0.3.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;