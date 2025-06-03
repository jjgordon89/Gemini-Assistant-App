import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';

// Import hooks
import { 
  useMemoryService, 
  useSupabase, 
  useGoogleAuth, 
  useUserSettings, 
  useChatMessages, 
  useAIProvider 
} from './hooks';

const App: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  
  // Initialize Supabase
  const { error: supabaseError } = useSupabase();
  
  // Initialize AI provider
  const {
    selectedProvider,
    setSelectedProvider,
    apiKeys,
    handleApiKeyChange,
    geminiChat,
    error: aiError,
    setError: setAiError,
    // apiKeys // This is already destructured below, ensure we use the correct one
  } = useAIProvider(userId);

  // Get Gemini API key for memory service
  const geminiApiKeyForEmbeddings = apiKeys[AiProviderType.GEMINI];

  // Initialize memory service
  const {
    memoryService,
    error: memoryError,
    setUserId: setMemoryUserId,
    isUsingMockEmbeddings // Get the mock status
  } = useMemoryService(geminiApiKeyForEmbeddings); // Pass the key
  
  // Initialize Google auth
  const {
    googleUserProfile,
    isGoogleLoggedIn,
    error: authError,
    isGoogleClientConfigured,
    handleGoogleLogin,
    handleGoogleLogout
  } = useGoogleAuth(
    // When user logs in, set user ID and memory service user ID
    (profile) => {
      if (profile.email) {
        setUserId(profile.email);
        setMemoryUserId(profile.email);
      }
    },
    // When user ID changes, update memory service
    (newUserId) => {
      setMemoryUserId(newUserId);
    }
  );
  
  // Initialize settings
  const {
    memoryEnabled,
    setMemoryEnabled,
    isLoading: settingsLoading,
    error: settingsError,
    theme,
    language,
    notificationsEnabled,
    setNotificationsEnabled,
    setTheme,
    setLanguage
  } = useUserSettings(userId);
  
  // Initialize chat messages
  const {
    messages,
    setMessages,
    isLoading: chatLoading,
    error: chatError,
    setError: setChatError,
    sendMessage
  } = useChatMessages(geminiChat, selectedProvider, memoryService, memoryEnabled);
  
  // Settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Combine errors from all sources
  const error = supabaseError || memoryError || aiError || authError || settingsError || chatError;
  
  // Clear user memory
  const handleClearMemory = async () => {
    if (memoryService && userId) {
      try {
        const deletedCount = await memoryService.clearUserMemory();
        alert(`Cleared ${deletedCount} messages from memory.`);
      } catch (err) {
        console.error("Failed to clear memory:", err);
        setChatError("Failed to clear memory. See console for details.");
      }
    } else {
      setChatError("Cannot clear memory: either memory service is not initialized or user is not logged in.");
    }
  };

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden antialiased">
        <Sidebar
          selectedProvider={selectedProvider}
          apiKeys={apiKeys}
          onApiKeyChange={handleApiKeyChange}
          isGoogleLoggedIn={isGoogleLoggedIn}
          googleUserProfile={googleUserProfile}
          onGoogleLogin={handleGoogleLogin}
          onGoogleLogout={handleGoogleLogout}
          isGoogleClientConfigured={isGoogleClientConfigured}
          onClearMemory={handleClearMemory}
          memoryEnabled={memoryEnabled}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
        <main className="flex-1 flex flex-col h-full chroma-gradient-bg relative">
          <div className="absolute top-0 left-0 right-0 h-16 bg-black/30 backdrop-blur-sm flex items-center px-6 z-10">
            <h1 className="text-2xl font-bold chroma-accent-text tracking-wider">Chroma AI</h1>
            <span className="ml-auto text-sm text-gray-400">Provider: {selectedProvider}</span>
          </div>

          {/* Notification for mock embeddings */}
          {isUsingMockEmbeddings && (
            <div
              className="bg-yellow-500 text-black p-2 text-center text-sm fixed top-16 left-0 right-0 z-50 shadow-md"
              role="alert"
            >
              Memory features are using mock embeddings due to a missing or invalid Gemini API key.
              Please configure your Gemini API key in Settings for full functionality.
            </div>
          )}

          <Routes>
            <Route path="/" element={
              <ChatView
                messages={messages}
                onSendMessage={sendMessage}
                isLoading={chatLoading}
                error={error}
                currentProvider={selectedProvider}
                apiKeys={apiKeys} // Pass apiKeys prop
              />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        {/* Add a conditional top margin to ChatView if the mock warning is shown, to prevent overlap */}
        {/* This is a bit of a hack, ideally the layout would handle this more gracefully */}
        {/* Or, adjust the Routes container's top padding */}
        
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          userId={userId}
          selectedProvider={selectedProvider}
          apiKeys={apiKeys}
          memoryEnabled={memoryEnabled}
          onToggleMemory={setMemoryEnabled}
        />
      </div>
    </HashRouter>
  );
};

export default App;