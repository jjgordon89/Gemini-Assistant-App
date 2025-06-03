
import React, { useState, useContext } from 'react'; // Added useContext
import { AiProviderType, GoogleUserProfile, Persona, Note, ChatRole } from '../types'; // Added ChatRole
import { SettingsIcon, GoogleIcon, ChevronDownIcon, ChevronUpIcon, KeyIcon, CalendarIcon, TasksIcon, GeminiLogoIcon, OpenAILogoIcon, GroqLogoIcon, HFLogoIcon, OpenRouterLogoIcon, UserCircleIcon, AlertTriangleIcon, BrainIcon, ClipboardDocumentListIcon, TrashIcon } from './icons/ChromaIcons';

// Import Contexts
import { AuthContext } from '../contexts/AuthContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { RAGContext } from '../contexts/RAGContext';
import { ChatContext } from '../contexts/ChatContext';

// Define constants if not imported (these were originally in App.tsx)
const YOUR_GEMINI_API_KEY_PLACEHOLDER = "YOUR_GEMINI_API_KEY_HERE";
const GEMINI_API_KEY_FROM_ENV = process.env.API_KEY; // Vite handles env vars

const providerIcons: Record<AiProviderType, React.FC<{className?: string}>> = {
    [AiProviderType.GEMINI]: GeminiLogoIcon,
    [AiProviderType.OPENAI]: OpenAILogoIcon,
    [AiProviderType.GROQ]: GroqLogoIcon,
    [AiProviderType.HUGGINGFACE]: HFLogoIcon,
    [AiProviderType.OPENROUTER]: OpenRouterLogoIcon,
};

export const Sidebar: React.FC = () => {
  // Consume contexts
  const authCtx = useContext(AuthContext);
  const settingsCtx = useContext(SettingsContext);
  const ragCtx = useContext(RAGContext);
  const chatCtx = useContext(ChatContext);

  // State for UI toggles remains local to Sidebar
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showGoogleIntegrations, setShowGoogleIntegrations] = useState(true);
  const [showPersonaSettings, setShowPersonaSettings] = useState(true);
  const [showLocalNotes, setShowLocalNotes] = useState(false);
  const [manualNoteInput, setManualNoteInput] = useState('');

  if (!authCtx || !settingsCtx || !ragCtx || !chatCtx) {
    return <aside className="w-72 bg-black/50 backdrop-blur-md p-5 border-r border-purple-900/30 flex flex-col space-y-6 scrollbar-thin overflow-y-auto">Loading sidebar contexts...</aside>;
  }

  // Destructure values from contexts
  const {
    isGoogleLoggedIn, googleUserProfile, handleGoogleLogin, handleGoogleLogout,
    isLoading: authLoading, error: authError, isGoogleClientConfigured
  } = authCtx;
  const {
    selectedProvider, setSelectedProvider, apiKeys, handleApiKeyChange,
    personas, selectedPersonaName, handleSelectPersona,
    customSystemPrompt, handleCustomSystemPromptChange
  } = settingsCtx;
  const {
    localNotes, handleManualAddNote, handleManualDeleteNote,
    isProcessingNote, ragError
  } = ragCtx;
  const { error: chatError, setMessages: setChatMessages } = chatCtx;

  const isGeminiKeyFromEnv = !!GEMINI_API_KEY_FROM_ENV && apiKeys[AiProviderType.GEMINI] === GEMINI_API_KEY_FROM_ENV;
  const isGeminiKeyPlaceholder = apiKeys[AiProviderType.GEMINI] === YOUR_GEMINI_API_KEY_PLACEHOLDER;

  const addMessageToChatForRAG = (msg: { text: string, role: 'system' | 'error' }) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: msg.text,
      sender: msg.role === 'system' ? ChatRole.SYSTEM : ChatRole.SYSTEM, // Or a specific "ERROR" role if defined
      timestamp: new Date(),
      role: msg.role // Store the role for potential styling
    }]);
  };

  const handleAddManualNoteClick = () => {
    if (manualNoteInput.trim()) {
      handleManualAddNote(manualNoteInput.trim(), addMessageToChatForRAG);
      setManualNoteInput('');
    }
  };

  const currentApiKey = apiKeys[selectedProvider];
  const placeholderForApiKeyInput = selectedProvider === AiProviderType.GEMINI 
    ? (isGeminiKeyFromEnv ? "Using key from environment" : "Enter Gemini API Key") 
    : `Enter ${selectedProvider} API Key`;

  // Consolidate API related errors for display
  let apiKeyError: string | null = null;
  if (selectedProvider === AiProviderType.GEMINI && (chatError?.includes("API Key") || ragError?.includes("API Key"))) {
    apiKeyError = chatError || ragError;
  }


  return (
    <aside className="w-72 bg-black/50 backdrop-blur-md p-5 border-r border-purple-900/30 flex flex-col space-y-6 scrollbar-thin overflow-y-auto">
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Provider</h2>
        <div className="relative">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as AiProviderType)}
            className="w-full p-3 bg-gray-800/70 border border-purple-700/60 rounded-lg appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white placeholder-gray-400 transition-colors"
            aria-label="Select AI Provider"
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
            aria-expanded={showApiKeys}
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
                        placeholder={placeholderForApiKeyInput}
                        value={selectedProvider === AiProviderType.GEMINI && isGeminiKeyPlaceholder ? "" : currentApiKey}
                        onChange={(e) => handleApiKeyChange(selectedProvider, e.target.value)}
                        className="w-full p-3 pl-10 bg-gray-800/70 border border-purple-700/60 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white placeholder-gray-500 transition-colors"
                        aria-label={`API Key for ${selectedProvider}`}
                        disabled={selectedProvider === AiProviderType.GEMINI && isGeminiKeyFromEnv}
                    />
                </div>
                {apiKeyError && (
                    <p className="text-xs text-red-400/90 mt-1 flex items-center">
                        <AlertTriangleIcon className="inline w-4 h-4 mr-1 flex-shrink-0" />
                        {apiKeyError}
                    </p>
                )}
                 {selectedProvider === AiProviderType.GEMINI && isGeminiKeyFromEnv && (
                    <p className="text-xs text-gray-500 mt-1">Using API key from environment variables for Gemini.</p>
                )}
                 {selectedProvider === AiProviderType.GEMINI && isGeminiKeyPlaceholder && !isGeminiKeyFromEnv && !apiKeyError && (
                    <p className="text-xs text-yellow-400/80 mt-1">
                        <AlertTriangleIcon className="inline w-3 h-3 mr-1" />
                        Gemini API Key is a placeholder. Please enter your key.
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
            onClick={() => setShowPersonaSettings(!showPersonaSettings)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-purple-400 transition-colors"
            aria-expanded={showPersonaSettings}
        >
            <span className="flex items-center"><BrainIcon className="w-4 h-4 mr-2" /> AI Persona</span>
            {showPersonaSettings ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        {showPersonaSettings && (
            <div className="space-y-3">
                <div>
                    <label htmlFor="personaSelector" className="text-sm text-gray-300 block mb-1">Select Persona</label>
                    <div className="relative">
                        <select
                            id="personaSelector"
                            value={selectedPersonaName}
                            onChange={(e) => handleSelectPersona(e.target.value)}
                            className="w-full p-3 bg-gray-800/70 border border-purple-700/60 rounded-lg appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white placeholder-gray-400 transition-colors"
                            aria-label="Select AI Persona"
                        >
                            {personas.map((persona) => (
                            <option key={persona.name} value={persona.name}>
                                {persona.name}
                            </option>
                            ))}
                        </select>
                        <ChevronDownIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
                {selectedPersonaName === 'Custom' && (
                    <div>
                        <label htmlFor="customPromptInput" className="text-sm text-gray-300 block mb-1">Custom System Prompt</label>
                        <textarea
                            id="customPromptInput"
                            value={customSystemPrompt}
                            onChange={(e) => handleCustomSystemPromptChange(e.target.value)}
                            placeholder="Enter your custom system prompt for the AI..."
                            rows={4}
                            className="w-full p-3 bg-gray-800/70 border border-purple-700/60 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-white placeholder-gray-500 transition-colors scrollbar-thin text-sm"
                            aria-label="Custom System Prompt"
                        />
                    </div>
                )}
            </div>
        )}
      </div>
      
      <div className="border-t border-purple-900/30 pt-6">
        <button
            onClick={() => setShowGoogleIntegrations(!showGoogleIntegrations)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-purple-400 transition-colors"
            aria-expanded={showGoogleIntegrations}
        >
            Google Integrations
            {showGoogleIntegrations ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        {showGoogleIntegrations && (
            <div className="space-y-3">
           {authError && (
             <div className="p-3 bg-red-800/30 border border-red-700 text-red-200 rounded-lg text-sm flex items-center">
               <AlertTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
               <span>{authError}</span>
             </div>
           )}
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
                onClick={isGoogleLoggedIn ? handleGoogleLogout : handleGoogleLogin}
                disabled={!isGoogleClientConfigured || authLoading}
                className={`w-full flex items-center justify-center p-3 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                ${isGoogleLoggedIn 
                    ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500' 
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white focus:ring-blue-500'}
                ${(!isGoogleClientConfigured || authLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={isGoogleLoggedIn ? 'Disconnect Google Account' : 'Connect Google Account'}
            >
                <GoogleIcon className="w-5 h-5 mr-2" />
                {authLoading ? (isGoogleLoggedIn ? 'Disconnecting...' : 'Connecting...') : (isGoogleLoggedIn ? 'Disconnect Google' : 'Connect Google Account')}
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
                    (isGoogleLoggedIn ? "Chatbot can now be developed to interact with your Google services." : "Connect to enable Google service interactions.")
                    : "Google integration is disabled due to missing configuration."
                }
            </p>
            </div>
        )}
      </div>

      <div className="border-t border-purple-900/30 pt-6">
        <button
          onClick={() => setShowLocalNotes(!showLocalNotes)}
          className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-purple-400 transition-colors"
          aria-expanded={showLocalNotes}
        >
          <span className="flex items-center"><ClipboardDocumentListIcon className="w-4 h-4 mr-2" /> Local Notes</span>
          {showLocalNotes ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        {showLocalNotes && (
          <div className="space-y-3">
            <div>
              <textarea
                value={manualNoteInput}
                onChange={(e) => setManualNoteInput(e.target.value)}
                placeholder="Type a new note..."
                rows={3}
                className="w-full p-2 bg-gray-800/70 border border-purple-700/60 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none text-white placeholder-gray-500 transition-colors scrollbar-thin text-sm"
                aria-label="New Note Input"
              />
              {ragError && ragError.includes("note") && (
                <p className="text-xs text-red-400/90 mt-1">{ragError}</p>
              )}
              <button
                onClick={handleAddManualNoteClick}
                className="mt-2 w-full p-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors disabled:opacity-50"
                disabled={!manualNoteInput.trim() || isProcessingNote}
              >
                {isProcessingNote && !manualNoteInput.includes(localNotes[0]?.content || 'impossible_match')
                  ? 'Adding Note...'
                  : 'Add Note'
                }
              </button>
            </div>
            {localNotes.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                {localNotes.slice().reverse().map(note => ( // Show newest first
                  <div key={note.id} className="p-2.5 bg-gray-700/50 rounded-md text-sm text-gray-300 group relative">
                    <p className="whitespace-pre-wrap break-words">{note.content}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(note.createdAt).toLocaleDateString()}</p>
                    <button
                      onClick={() => handleManualDeleteNote(note.id, addMessageToChatForRAG)}
                      disabled={isProcessingNote}
                      className="absolute top-1 right-1 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      aria-label="Delete note"
                    >
                       {isProcessingNote && localNotes.find(n => n.id === note.id) // Basic check if this note is being processed
                        ? <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        : <TrashIcon className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center">No notes yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-purple-900/30">
        <div className="flex items-center space-x-2 text-gray-500 hover:text-purple-400 transition-colors cursor-pointer" role="button" tabIndex={0} onClick={() => alert("Settings panel not yet implemented.")} onKeyDown={(e) => e.key === 'Enter' && alert("Settings panel not yet implemented.")}>
            <SettingsIcon className="w-5 h-5" />
            <span className="text-sm">Settings</span>
        </div>
        <p className="text-xs text-gray-600 mt-4">Chroma AI v0.3.1</p> {/* Version bump for notes feature */}
      </div>
    </aside>
  );
};
