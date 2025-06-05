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
  
  // Initialize memory service
  const { 
    memoryService, 
    error: memoryError, 
    setUserId: setMemoryUserId 
  } = useMemoryService(process.env.API_KEY);
    // Initialize AI provider
  const {
    selectedProvider,
    setSelectedProvider,
    apiKeys,
    handleApiKeyChange,
    geminiChat,
    aiProviderService,
    error: aiError,
    setError: setAiError
  } = useAIProvider(userId);
  
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
  } = useChatMessages(geminiChat, selectedProvider, aiProviderService, memoryService, memoryEnabled);
  
  // Settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Combine errors from all sources
  const error = supabaseError || memoryError || aiError || authError || settingsError || chatError;
    // Clear user memory
  const handleClearMemory = async () => {
    if (memoryService && userId) {
      try {
        await memoryService.clearAll();
        alert("Cleared all messages from memory.");
      } catch (err) {
        console.error("Failed to clear memory:", err);
        setChatError("Failed to clear memory. See console for details.");
      }
    } else {
      setChatError("Cannot clear memory: either memory service is not initialized or user is not logged in.");
    }
  };

  // Handle file upload
  const handleFileUpload = async (content: string, fileName: string, fileType: string) => {
    try {
      // Create a message with the file content
      const fileMessage = `File uploaded: ${fileName} (${fileType})\n\nContent:\n${content}`;
      
      // Send the file content as a message
      await sendMessage(fileMessage);
      
      console.log(`File ${fileName} uploaded and processed successfully`);
    } catch (error) {
      console.error('Error handling file upload:', error);
      setChatError('Failed to process uploaded file');
    }
  };

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden antialiased">        <Sidebar
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
          onFileUpload={handleFileUpload}
        />
        <main className="flex-1 flex flex-col h-full chroma-gradient-bg relative">
          <div className="absolute top-0 left-0 right-0 h-16 bg-black/30 backdrop-blur-sm flex items-center px-6 z-10">
            <h1 className="text-2xl font-bold chroma-accent-text tracking-wider">Chroma AI</h1>
            <span className="ml-auto text-sm text-gray-400">Provider: {selectedProvider}</span>
          </div>

          <Routes>
            <Route path="/" element={
              <ChatView
                messages={messages}
                onSendMessage={sendMessage}
                isLoading={chatLoading}
                error={error}
                currentProvider={selectedProvider}
              />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        
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