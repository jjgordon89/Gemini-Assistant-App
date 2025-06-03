import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { AiProviderType, Message, ChatRole, GoogleUserProfile } from './types';
import { GoogleGenAI, Chat } from "@google/genai"; 

import * as GoogleAuthService from './services/googleAuthService';
// Import Google Calendar and Tasks services if you want to test direct calls (not through AI yet)
// import * as GoogleCalendarService from './services/googleCalendarService';
// import * as GoogleTasksService from './services/googleTasksService';

// Import memory services
import ConversationMemoryService from './services/conversationMemoryService';
import EmbeddingService from './services/embeddingService';
import { UserSettingsService, SettingName, SupabaseService } from './services';

// Mock API key for Gemini (should be in process.env.API_KEY in a real build environment)
const GEMINI_API_KEY = process.env.API_KEY || "AIzaSyD7nVDOiec5dS1ie9zMQp_plrDCcNeKJPw"; 
// IMPORTANT: Replace with your actual Google Client ID in index.html and here for initialization check
const GOOGLE_CLIENT_ID = (document.querySelector('meta[name="google-signin-client_id"]') as HTMLMetaElement)?.content || "YOUR_GOOGLE_CLIENT_ID";


const App: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<AiProviderType>(AiProviderType.GEMINI);
  const [apiKeys, setApiKeys] = useState<Record<AiProviderType, string>>({
    [AiProviderType.GEMINI]: GEMINI_API_KEY,
    [AiProviderType.OPENAI]: '',
    [AiProviderType.GROQ]: '',
    [AiProviderType.HUGGINGFACE]: '',
    [AiProviderType.OPENROUTER]: '',
  });

  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUserProfile, setGoogleUserProfile] = useState<GoogleUserProfile | null>(null);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);
  const [memoryService, setMemoryService] = useState<ConversationMemoryService | null>(null);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(true);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [userSettingsLoaded, setUserSettingsLoaded] = useState(false);

  const handleGoogleTokenResponse = useCallback(async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
    setGoogleAccessToken(tokenResponse.access_token);
    setIsGoogleLoggedIn(true);
    setError(null);
    try {
      const profile = await GoogleAuthService.fetchUserProfile(tokenResponse.access_token);
      setGoogleUserProfile(profile);
      
      // Set user ID in memory service when user logs in
      if (memoryService && profile.email) {
        memoryService.setUserId(profile.email);
      }
      
      // Load user settings from Supabase
      if (profile.email) {
        try {
          const userSettingsService = UserSettingsService.getInstance();
          const settings = await userSettingsService.getSettings(profile.email);
          
          // Process settings
          let newApiKeys = {...apiKeys};
          let newProvider = selectedProvider;
          let newMemoryEnabled = memoryEnabled;
          
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
              case SettingName.MEMORY_ENABLED:
                newMemoryEnabled = setting.setting_value === 'true';
                break;
            }
          });
          
          // Apply settings
          setApiKeys(newApiKeys);
          setSelectedProvider(newProvider);
          setMemoryEnabled(newMemoryEnabled);
          setUserSettingsLoaded(true);
          
          console.log('User settings loaded from Supabase');
        } catch (err) {
          console.error('Error loading user settings from Supabase:', err);
          // Continue with default settings
        }
      }
      
      // Example: Fetch calendar events after login
      // if (tokenResponse.access_token) {
      //   const events = await GoogleCalendarService.getCalendarEvents(tokenResponse.access_token);
      //   console.log("Fetched Google Calendar Events:", events);
      //   const taskLists = await GoogleTasksService.getTaskLists(tokenResponse.access_token);
      //   console.log("Fetched Google Task Lists:", taskLists);
      //   if (taskLists.length > 0) {
      //       const tasks = await GoogleTasksService.getTasks(tokenResponse.access_token, taskLists[0].id);
      //       console.log(`Tasks from ${taskLists[0].title}:`, tasks);
      //   }
      // }
    } catch (e) {
      console.error("Error fetching Google user profile or initial data:", e);
      setError("Failed to fetch Google user profile. See console for details.");
      // Keep logged in state, but profile might be missing
    }
  }, [memoryService, apiKeys, selectedProvider, memoryEnabled]);

  const handleGoogleError = useCallback((errorResponse: any) => { // Changed error to errorResponse to avoid conflict
    console.error("Google Sign-In Error:", errorResponse);
    setError(errorResponse.message || "Google Sign-In failed. Check console for details.");
    setIsGoogleLoggedIn(false);
    setGoogleAccessToken(null);
    setGoogleUserProfile(null);
    
    // Clear user ID in memory service when user logs out
    if (memoryService) {
      memoryService.setUserId(null);
    }
  }, [memoryService]);

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
        // Initialize memory service with Gemini API key for embeddings
        const memory = ConversationMemoryService.getInstance(apiKeys[AiProviderType.GEMINI]);
        await memory.initialize();
        setMemoryService(memory);
        
        // Set user ID if already logged in
        if (googleUserProfile?.email) {
          memory.setUserId(googleUserProfile.email);
        }
        
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
  }, [apiKeys]);

  useEffect(() => {
    // Initialize Google Sign In
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID") {
        GoogleAuthService.initGoogleSignIn(GOOGLE_CLIENT_ID, handleGoogleTokenResponse, handleGoogleError)
          .then(() => console.log("Google Sign-In initialized."))
          .catch(err => {
            console.error("Google Sign-In initialization failed:", err);
            setError("Google Sign-In could not be initialized. Ensure Client ID is correct and GIS library is loaded.");
          });
    } else {
        console.warn("Google Client ID not configured. Google Sign-In will not be available.");
        setError("Google integration disabled: Client ID not configured.");
    }
  }, [handleGoogleTokenResponse, handleGoogleError]);


  useEffect(() => {
    if (selectedProvider === AiProviderType.GEMINI && apiKeys[AiProviderType.GEMINI] && apiKeys[AiProviderType.GEMINI] !== "YOUR_GEMINI_API_KEY_HERE") {
      try {
        const ai = new GoogleGenAI({ apiKey: apiKeys[AiProviderType.GEMINI] });
        const chatInstance = ai.chats.create({
          model: 'gemini-2.5-flash-preview-04-17',
          config: {
            // System instruction updated to reflect potential (but not yet fully wired through AI) Google service interaction
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
  }, [selectedProvider, apiKeys, isGoogleLoggedIn]); // Added isGoogleLoggedIn to re-evaluate system prompt context

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const newUserMessage: Message = { id: Date.now().toString(), text, sender: ChatRole.USER, timestamp: new Date() };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Store user message in memory
      if (memoryService && memoryEnabled) {
        await memoryService.storeMessage(newUserMessage)
          .catch(err => console.error("Failed to store message in memory:", err));
      }
      
      if (selectedProvider === AiProviderType.GEMINI) {
        if (!geminiChat) {
          throw new Error("Gemini chat is not initialized. Check API Key.");
        }
        
        let accumulatedResponse = "";
        setMessages(prev => [...prev, { id: 'ai-typing', text: '', sender: ChatRole.MODEL, timestamp: new Date(), streaming: true }]);

        // Get memory context if available
        let memoryContext = "";
        if (memoryService && memoryEnabled) {
          try {
            memoryContext = await memoryService.generateContextualMemory(text, 3, 0.7);
            console.log("Memory context:", memoryContext);
          } catch (err) {
            console.error("Failed to retrieve memory context:", err);
          }
        }

        // Add memory context to the message if available
        const messageWithContext = memoryContext ? 
          { message: text, context: memoryContext } : 
          { message: text };

        const stream = await geminiChat.sendMessageStream(messageWithContext);
        for await (const chunk of stream) {
          accumulatedResponse += chunk.text;
          setMessages(prev => prev.map(msg => 
            msg.id === 'ai-typing' ? { ...msg, text: accumulatedResponse } : msg
          ));
        }
        
        const aiResponseMessage = {
          id: Date.now().toString() + '-ai', 
          streaming: false, 
          text: accumulatedResponse, 
          sender: ChatRole.MODEL,
          timestamp: new Date()
        };
        
        setMessages(prev => prev.map(msg => 
            msg.id === 'ai-typing' ? aiResponseMessage : msg
        ));
        
        // Store AI response in memory
        if (memoryService && memoryEnabled) {
          await memoryService.storeMessage(aiResponseMessage)
            .catch(err => console.error("Failed to store AI response in memory:", err));
        }

      } else {
        // Placeholder for other AI providers
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        const aiResponse: Message = {
          id: Date.now().toString() + '-ai',
          text: `Response from ${selectedProvider}: ${text} (Not implemented yet)`,
          sender: ChatRole.MODEL,
          timestamp: new Date()
        };
        setMessages(prevMessages => [...prevMessages, aiResponse]);
        
        // Store AI response in memory
        if (memoryService && memoryEnabled) {
          await memoryService.storeMessage(aiResponse)
            .catch(err => console.error("Failed to store AI response in memory:", err));
        }
      }
    } catch (e) {
      console.error("Error sending message:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to get response: ${errorMessage}`);
      setMessages(prevMessages => [...prevMessages, {id: Date.now().toString() + '-error', text: `Error: ${errorMessage}`, sender: ChatRole.MODEL, timestamp: new Date()}]);
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.filter(msg => !(msg.id === 'ai-typing' && msg.text === '')));
    }
  };

  const handleGoogleLogin = () => {
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID") {
        GoogleAuthService.signInWithGoogle();
    } else {
        setError("Google Client ID not configured. Cannot sign in.");
        alert("Google Client ID not configured. Please check the application setup.");
    }
  };

  const handleGoogleLogout = async () => {
    await GoogleAuthService.signOutWithGoogle();
    setGoogleAccessToken(null);
    setGoogleUserProfile(null);
    setIsGoogleLoggedIn(false);
    setError(null); // Clear any previous Google-related errors
    
    // Clear user ID in memory service when user logs out
    if (memoryService) {
      memoryService.setUserId(null);
    }
  };
  
  const handleApiKeyChange = (provider: AiProviderType, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  const handleClearMemory = async () => {
    if (memoryService && googleUserProfile?.email) {
      try {
        const deletedCount = await memoryService.clearUserMemory();
        alert(`Cleared ${deletedCount} messages from memory.`);
      } catch (err) {
        console.error("Failed to clear memory:", err);
        setError("Failed to clear memory. See console for details.");
      }
    } else {
      setError("Cannot clear memory: either memory service is not initialized or user is not logged in.");
    }
  };

  const handleToggleMemory = async (enabled: boolean) => {
    setMemoryEnabled(enabled);
    
    // Save setting to Supabase if user is logged in
    if (googleUserProfile?.email) {
      try {
        const userSettingsService = UserSettingsService.getInstance();
        await userSettingsService.updateSetting(
          googleUserProfile.email,
          SettingName.MEMORY_ENABLED,
          String(enabled)
        );
      } catch (err) {
        console.error('Failed to save memory setting:', err);
        // Continue with the setting change in memory only
      }
    }
  };

  const saveUserSettings = async () => {
    if (!googleUserProfile?.email) return;
    
    try {
      const userSettingsService = UserSettingsService.getInstance();
      
      // Save API provider and keys
      await userSettingsService.updateSetting(
        googleUserProfile.email,
        SettingName.API_PROVIDER,
        selectedProvider
      );
      
      await userSettingsService.updateSetting(
        googleUserProfile.email,
        SettingName.API_KEYS,
        JSON.stringify(apiKeys)
      );
      
      await userSettingsService.updateSetting(
        googleUserProfile.email,
        SettingName.MEMORY_ENABLED,
        String(memoryEnabled)
      );
      
      console.log('User settings saved to Supabase');
    } catch (err) {
      console.error('Failed to save user settings to Supabase:', err);
      setError('Failed to save settings. Changes may not persist between sessions.');
    }
  };

  // Save settings to Supabase when they change and user is logged in
  useEffect(() => {
    if (googleUserProfile?.email && userSettingsLoaded) {
      saveUserSettings();
    }
  }, [selectedProvider, apiKeys, memoryEnabled, userSettingsLoaded]);

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden antialiased">
        <Sidebar
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          apiKeys={apiKeys}
          onApiKeyChange={handleApiKeyChange}
          isGoogleLoggedIn={isGoogleLoggedIn}
          googleUserProfile={googleUserProfile}
          onGoogleLogin={handleGoogleLogin}
          onGoogleLogout={handleGoogleLogout}
          isGoogleClientConfigured={GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID"}
          onClearMemory={handleClearMemory}
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
          userId={googleUserProfile?.email || null}
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          apiKeys={apiKeys}
          onApiKeyChange={handleApiKeyChange}
          memoryEnabled={memoryEnabled}
          onToggleMemory={handleToggleMemory}
        />
      </div>
    </HashRouter>
  );
};

export default App;