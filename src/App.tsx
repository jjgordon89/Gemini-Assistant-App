

import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { AiProviderType, Message, ChatRole, GoogleUserProfile, Persona, Part, Note,
         CreateCalendarEventArgs, AddTaskArgs, GetWeatherArgs, SearchCalendarEventsArgs, UpdateCalendarEventArgs, DeleteCalendarEventArgs,
         SearchTasksArgs, UpdateTaskArgs, DeleteTaskArgs, AddNoteArgs, ViewNotesArgs, DeleteNoteArgs, UploadedFileData, RAGChunk
       } from './types';
import { GoogleGenAI, Chat, FunctionDeclaration, GenerateContentResponse, Tool } from "@google/genai";
import { allTools } from './toolSchemas';

// Import Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ChatProvider } from './contexts/ChatContext';
import { RAGProvider } from './contexts/RAGContext';

import * as GoogleAuthService from './services/googleAuthService';
import * as GoogleCalendarService from './services/googleCalendarService';
import *  as GoogleTasksService from './services/googleTasksService';
import * as WeatherService from './services/weatherService';
import * as FileService from './services/fileService';
import * as NoteService from './services/noteService';
import * as LanceDbService from './services/lanceDbService';


// Use a consistent placeholder for the API key
const YOUR_GEMINI_API_KEY_PLACEHOLDER = "YOUR_GEMINI_API_KEY_HERE";
const GEMINI_API_KEY_FROM_ENV = process.env.API_KEY;
const INITIAL_GEMINI_KEY = GEMINI_API_KEY_FROM_ENV || YOUR_GEMINI_API_KEY_PLACEHOLDER;

const GOOGLE_CLIENT_ID = (document.querySelector('meta[name="google-signin-client_id"]') as HTMLMetaElement)?.content || "YOUR_GOOGLE_CLIENT_ID";

const defaultPersonas: Persona[] = [
  { name: 'Helpful Assistant', prompt: 'You are a helpful and friendly AI assistant. Be concise and informative.' },
  { name: 'Creative Idea Generator', prompt: 'You are a highly creative AI. Brainstorm innovative ideas and think outside the box. Your responses should be imaginative and inspiring.' },
  { name: 'Code Helper', prompt: 'You are an expert AI programmer. Provide code examples in markdown, explain complex programming concepts clearly, and help debug code. Be precise and technically accurate.' },
  { name: 'Formal Assistant', prompt: 'You are a professional and formal AI assistant. Maintain a respectful and business-like tone in all your communications. Avoid colloquialisms.' },
  { name: 'Sarcastic Bot', prompt: 'You are a sarcastic bot. Your responses should be witty and have a dry sense of humor, but still be helpful in your own quirky way. Don\'t be mean, just amusingly cynical.'},
  { name: 'Custom', prompt: 'You are a custom AI. Follow the instructions provided.' },
];
const DEFAULT_SYSTEM_PROMPT = defaultPersonas[0].prompt;


const App: React.FC = () => {
  // State and useEffects previously here will be removed gradually.
  // For now, focus on wrapping with providers.
  // Some state might remain if it's truly local to App or passed as props to providers.

  // The constants defined above (YOUR_GEMINI_API_KEY_PLACEHOLDER, etc.) remain for now.
  // They will be used to pass initial values to providers.

  // Original state that will be moved or replaced (listing some examples):
  // const [selectedProvider, setSelectedProvider] = useState<AiProviderType>(AiProviderType.GEMINI);
  // const [apiKeys, setApiKeys] = useState<Record<AiProviderType, string>>({
  // ... many more state variables and useEffects ...

  // All state and useEffects related to contexts have been moved to their respective provider files.
  // The App component itself is now much simpler.

  // const isGeminiKeyPlaceholder = apiKeys[AiProviderType.GEMINI] === YOUR_GEMINI_API_KEY_PLACEHOLDER; // This logic will move to SettingsContext or components consuming it

  // This is the new structure with Providers:
  return (
    <SettingsProvider
      defaultPersonas={defaultPersonas}
      initialGeminiKey={INITIAL_GEMINI_KEY}
      initialSelectedPersonaName={defaultPersonas[0].name}
      initialCustomSystemPrompt={'You are a helpful AI. Behave as I instruct.'}
    >
      <AuthProvider googleClientId={GOOGLE_CLIENT_ID}>
        <RAGProvider geminiApiKey={INITIAL_GEMINI_KEY}> {/* This might later consume SettingsContext for the key */}
          <ChatProvider allTools={allTools} defaultSystemPrompt={DEFAULT_SYSTEM_PROMPT}>
            <HashRouter>
              <div className="flex h-screen overflow-hidden antialiased">
                {/* Sidebar and ChatView will be refactored to use contexts */}
                <AppContent />
              </div>
            </HashRouter>
          </ChatProvider>
        </RAGProvider>
      </AuthProvider>
    </SettingsProvider>
  );
};

import { useContext } from 'react'; // Import useContext

// Import Contexts themselves for consumption
import { AuthContext } from './contexts/AuthContext';
import { SettingsContext } from './contexts/SettingsContext';
import { ChatContext } from './contexts/ChatContext';
import { RAGContext, RAGContextForChat } from './contexts/RAGContext';


// New component to contain the actual UI, which will consume contexts
const AppContent: React.FC = () => {
  const authCtx = useContext(AuthContext);
  const settingsCtx = useContext(SettingsContext);
  const chatCtx = useContext(ChatContext);
  const ragCtx = useContext(RAGContext);

  if (!authCtx || !settingsCtx || !chatCtx || !ragCtx) {
    // This can happen if a context is undefined, providers not set up correctly
    // Or if AppContent is somehow rendered outside a provider
    // A loading spinner or error message would be appropriate here
    return <div>Loading contexts or context error...</div>;
  }

  // Destructure necessary values and functions from contexts
  const {
    googleUserProfile, isGoogleLoggedIn, handleGoogleLogin, handleGoogleLogout,
    isLoading: authIsLoading, error: authError
  } = authCtx;
  const {
    apiKeys, selectedProvider, personas, selectedPersonaName, customSystemPrompt,
    handleApiKeyChange, setSelectedProvider, handleSelectPersona, handleCustomSystemPromptChange
  } = settingsCtx;
  const {
    messages, isLoading: chatIsLoading, error: chatError, isUsingTool, geminiChat, // geminiChat for potential direct use if needed
    handleSendMessage, setMessages, setIsLoading: setChatIsLoading, setError: setChatError // Exposing setters if needed by children directly
  } = chatCtx;
  const {
    localNotes, uploadedFileData, activeRAGFile, aiInstance, // aiInstance for RAG operations
    handleFileChange, handleManualAddNote, handleManualDeleteNote,
    getEmbeddings, chunkText, searchRelevantChunks, clearUploadedFile
  } = ragCtx;

  const isGeminiKeyPlaceholder = apiKeys[AiProviderType.GEMINI] === YOUR_GEMINI_API_KEY_PLACEHOLDER;
  const isGeminiKeyFromEnv = !!GEMINI_API_KEY_FROM_ENV && apiKeys[AiProviderType.GEMINI] === GEMINI_API_KEY_FROM_ENV;

  // Prepare the RAG context subset for handleSendMessage
  const ragContextForChat: RAGContextForChat = {
    aiInstance,
    activeRAGFile,
    uploadedFileData,
    clearUploadedFile,
    addMessageToChat: (msg) => setMessages(prev => [...prev, { ...msg, id: Date.now().toString(), timestamp: new Date(), sender: msg.role as ChatRole }]),
    searchRelevantChunks,
    getEmbeddingsFromRAG: (texts) => getEmbeddings(texts, aiInstance!), // Assuming aiInstance is available
    chunkText,
  };

  // Prepare settings context for handleSendMessage
  const settingsContextForChat = {
    apiKeys, selectedProvider, selectedPersonaName, customSystemPrompt, personas
  };

  // Prepare auth context for handleSendMessage
  const authContextForChat = { googleAccessToken: authCtx.googleAccessToken, isGoogleLoggedIn };


  // Consolidate errors for potential display
  // Prioritize more specific errors or critical ones first.
  let consolidatedError: string | null = null;
  if (authCtx.error) consolidatedError = authCtx.error;
  else if (ragCtx.ragError) consolidatedError = ragCtx.ragError; // RAG errors might be more persistent (e.g. API key for embeddings)
  else if (chatCtx.error) consolidatedError = chatCtx.error; // Chat errors might be more transient

  // Consolidate loading states for a general "app busy" feel if needed, though specific indicators are better.
  const isAppBusy = authCtx.isLoading || chatCtx.isLoading || ragCtx.isProcessingFile || ragCtx.isProcessingNote;


  return (
    <>
      {/* Pass relevant loading/error states to Sidebar and ChatView if they don't consume contexts directly */}
      {/* For now, assuming Sidebar and ChatView will be refactored to consume contexts for these states themselves */}
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
        personas={personas}
        selectedPersonaName={selectedPersonaName}
        onSelectPersona={handleSelectPersona}
        customSystemPrompt={customSystemPrompt}
        onCustomSystemPromptChange={handleCustomSystemPromptChange}
        isGeminiKeyFromEnv={isGeminiKeyFromEnv}
        isGeminiKeyPlaceholder={isGeminiKeyPlaceholder}
        localNotes={localNotes}
        // Pass the version of add/delete note that uses chat context's addMessage
        onManualAddNote={(content) => handleManualAddNote(content, ragContextForChat.addMessageToChat)}
        onManualDeleteNote={(id) => handleManualDeleteNote(id, ragContextForChat.addMessageToChat)}
      />
      <main className="flex-1 flex flex-col h-full chroma-gradient-bg relative">
        <div className="absolute top-0 left-0 right-0 h-16 bg-black/30 backdrop-blur-sm flex items-center px-6 z-10">
          <h1 className="text-2xl font-bold chroma-accent-text tracking-wider">Chroma AI</h1>
          <span className="ml-auto text-sm text-gray-400">
            Provider: {selectedProvider} | Persona: {selectedPersonaName}
            {isUsingTool ? `| Tool: ${isUsingTool}` : ''}
            {activeRAGFile ? `| Context: ${activeRAGFile.name}` : ''}
          </span>
        </div>

        <Routes>
          <Route path="/" element={
            <ChatView
              messages={messages}
              onSendMessage={(text) => handleSendMessage(text, ragContextForChat, settingsContextForChat, authContextForChat)}
              isLoading={chatCtx.isLoading} // ChatView's primary loading is for message sending
              error={consolidatedError} // Pass the consolidated error to ChatView for display
              currentProvider={selectedProvider}
              isGeminiKeyPlaceholder={isGeminiKeyPlaceholder}
              onFileChange={(file) => handleFileChange(file, ragContextForChat.addMessageToChat)}
              uploadedFileData={uploadedFileData}
            />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
};

export default App;
