import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { GoogleUserProfile } from './types';

// Import services
import ConversationMemoryService from './services/conversationMemoryService';
import { SupabaseService } from './services';

// Import context providers
import { AIProviderProvider, AuthProvider, ChatProvider, SettingsProvider } from './contexts';

const App: React.FC = () => {
  const [memoryService, setMemoryService] = useState<ConversationMemoryService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize Supabase
  useEffect(() => {
    try {
      const supabaseService = SupabaseService.getInstance();
      supabaseService.initialize();
      console.log('Supabase initialized');
    } catch (err) {
      console.error('Failed to initialize Supabase:', err);
      setError('Failed to initialize Supabase. Some features may be unavailable.');
    }
  }, []);

  // Initialize memory service
  useEffect(() => {
    const initializeMemory = async () => {
      try {
        // Initialize memory service with environment API key for embeddings
        const memory = ConversationMemoryService.getInstance(process.env.API_KEY);
        await memory.initialize();
        setMemoryService(memory);
        
        console.log("Memory service initialized");
      } catch (err) {
        console.error("Failed to initialize memory service:", err);
        setError("Failed to initialize memory service. Some features may be unavailable.");
      }
    };
    
    initializeMemory();
    
    // Cleanup on unmount
    return () => {
      if (memoryService) {
        memoryService.close().catch(err => {
          console.error("Error closing memory service:", err);
        });
      }
    };
  }, []);

  const handleUserLogin = useCallback((profile: GoogleUserProfile) => {
    if (profile.email) {
      setUserId(profile.email);
    }
  }, []);

  return (
    <HashRouter>
      <AIProviderProvider userId={userId}>
        {({ selectedProvider, apiKeys, handleApiKeyChange, geminiChat, error: aiError, setError: setAiError }) => (
          <AuthProvider onUserLogin={handleUserLogin} memoryService={memoryService}>
            {({ googleUserProfile, isGoogleLoggedIn, handleGoogleLogin, handleGoogleLogout, isGoogleClientConfigured }) => (
              <SettingsProvider 
                userId={userId} 
                memoryService={memoryService}
              >
                {({ memoryEnabled, setMemoryEnabled, isSettingsModalOpen, setIsSettingsModalOpen, clearMemory }) => (
                  <ChatProvider
                    geminiChat={geminiChat}
                    selectedProvider={selectedProvider}
                    memoryService={memoryService}
                    memoryEnabled={memoryEnabled}
                    error={error || aiError}
                    setError={setAiError}
                  >
                    {({ messages, isLoading, error: chatError, handleSendMessage }) => (
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
                          onClearMemory={clearMemory}
                          memoryEnabled={memoryEnabled}
                          onOpenSettings={() => setIsSettingsModalOpen(true)}
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
                                onSendMessage={handleSendMessage}
                                isLoading={isLoading}
                                error={chatError}
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
                    )}
                  </ChatProvider>
                )}
              </SettingsProvider>
            )}
          </AuthProvider>
        )}
      </AIProviderProvider>
    </HashRouter>
  );
};

export default App;