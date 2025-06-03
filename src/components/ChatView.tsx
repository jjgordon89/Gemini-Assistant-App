

import React, { useRef, useEffect, useContext, useState } from 'react'; // Added useContext, useState
import { Message, ChatRole, AiProviderType, UploadedFileData } from '../types';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { ChromaSphereIcon, AlertTriangleIcon } from './icons/ChromaIcons';

// Import Contexts
import { ChatContext } from '../contexts/ChatContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { RAGContext } from '../contexts/RAGContext';

// Define constants if not imported
const YOUR_GEMINI_API_KEY_PLACEHOLDER = "YOUR_GEMINI_API_KEY_HERE";

interface ChatViewProps {
  error: string | null; // Consolidated error from AppContent (includes auth, initial RAG, and chat errors)
}

export const ChatView: React.FC<ChatViewProps> = ({ error: consolidatedErrorProp }) => {
  const chatCtx = useContext(ChatContext);
  const settingsCtx = useContext(SettingsContext);
  const ragCtx = useContext(RAGContext);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [fileInputError, setFileInputError] = useState<string | null>(null); // Local to ChatView for direct file input feedback

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatCtx?.messages]);

  if (!chatCtx || !settingsCtx || !ragCtx) {
    return <div className="flex-1 flex flex-col p-6 justify-center items-center text-white">Loading chat contexts...</div>;
  }

  const {
    messages, handleSendMessage, isLoading: chatIsLoading, error: chatErrorFromCtx, setMessages
  } = chatCtx;
  const { selectedProvider, apiKeys } = settingsCtx;
  const {
    uploadedFileData, handleFileChange, isProcessingFile, ragError: ragErrorFromCtx, setUploadedFileData
  } = ragCtx;

  const isGeminiKeyPlaceholder = selectedProvider === AiProviderType.GEMINI &&
                                 (apiKeys[AiProviderType.GEMINI] === YOUR_GEMINI_API_KEY_PLACEHOLDER || !apiKeys[AiProviderType.GEMINI]);

  const effectiveIsLoading = chatIsLoading || isProcessingFile;
  // Prioritize errors: prop (critical) > chat > RAG > local file input
  const displayError = consolidatedErrorProp || chatErrorFromCtx || ragErrorFromCtx || fileInputError;

  const addMessageToChatForRAGUI = (msg: { text: string, role: 'system' | 'error' }) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: msg.text,
      sender: msg.role === 'system' ? ChatRole.SYSTEM : ChatRole.SYSTEM, // Or specific ERROR role
      timestamp: new Date(),
      role: msg.role
    }]);
  };

  const handleFileSelectedForChatInput = async (file: File | null) => {
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        setFileInputError("File size exceeds 20MB. Max 20MB allowed.");
        return; // Don't call handleFileChange from context
      }
      const supportedTypes = ['text/plain', 'application/pdf', 'image/jpeg', 'image/png'];
      if (!supportedTypes.includes(file.type)) {
        setFileInputError(`Unsupported file type: ${file.type}. Supported: TXT, PDF, JPG, PNG.`);
        return; // Don't call handleFileChange
      }
      setFileInputError(null); // Clear local error
      await handleFileChange(file, addMessageToChatForRAGUI);
    } else {
      // If user cancels file dialog, or if we want to clear
      // await handleFileChange(null, addMessageToChatForRAGUI);
    }
  };

  const handleClearFileForChatInput = () => {
    setUploadedFileData(null); // From RAGContext
    setFileInputError(null);   // Clear local file error
  };

  return (
    <div className="flex flex-col h-full pt-16"> {/* pt-16 for the fixed header */}
      <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {messages.length === 0 && !effectiveIsLoading && !displayError && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <div className="w-24 h-24 mb-4">
                <ChromaSphereIcon />
            </div>
            <h2 className="text-2xl font-semibold text-gray-200">Welcome to Chroma AI</h2>
            <p className="mt-2">Using <span className="font-semibold chroma-accent-text">{selectedProvider}</span>. Type a message to start chatting.</p>
            {selectedProvider === AiProviderType.GEMINI && isGeminiKeyPlaceholder && (
                 <p className="mt-2 text-yellow-500 text-sm">
                    <AlertTriangleIcon className="inline w-4 h-4 mr-1" />
                    Note: Gemini API key is missing or a placeholder. Please set your API key in the sidebar for full functionality.
                 </p>
            )}
             {isProcessingFile && uploadedFileData && (
              <p className="mt-2 text-blue-400 text-sm">Processing '{uploadedFileData.name}'...</p>
            )}
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {displayError && (
        <div className="p-4 m-4 bg-red-800/50 border border-red-700 text-red-200 rounded-lg text-sm flex items-center">
          <AlertTriangleIcon className="inline w-5 h-5 mr-2 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
      <ChatInput
        onSendMessage={handleSendMessage} // handleSendMessage from ChatContext doesn't need extra args now
        isLoading={effectiveIsLoading}
        onFileChange={handleFileSelectedForChatInput} // Uses local validation before calling context's handleFileChange
        uploadedFileData={uploadedFileData}
        onClearFile={handleClearFileForChatInput} // New prop for ChatInput
        disabled={isGeminiKeyPlaceholder && selectedProvider === AiProviderType.GEMINI} // Disable input if key is placeholder for Gemini
      />
    </div>
  );
};