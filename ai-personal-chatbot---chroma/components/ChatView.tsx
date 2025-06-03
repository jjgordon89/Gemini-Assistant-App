import React, { useRef, useEffect } from 'react';
import { Message, ChatRole, AiProviderType } from '../types';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { ChromaSphereIcon, AlertTriangleIcon } from './icons/ChromaIcons';

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  error: string | null;
  currentProvider: AiProviderType;
  apiKeys: Record<AiProviderType, string>; // Add apiKeys to props
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, onSendMessage, isLoading, error, currentProvider, apiKeys }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full pt-16"> {/* pt-16 for the fixed header */}
      <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {messages.length === 0 && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <div className="w-24 h-24 mb-4">
                <ChromaSphereIcon />
            </div>
            <h2 className="text-2xl font-semibold text-gray-200">Welcome to Chroma AI</h2>
            <p className="mt-2">Using <span className="font-semibold chroma-accent-text">{currentProvider}</span>. Type a message to start chatting.</p>
            {currentProvider === AiProviderType.GEMINI && apiKeys[AiProviderType.GEMINI] === "YOUR_GEMINI_API_KEY_HERE" && (
                 <p className="mt-2 text-yellow-500 text-sm">
                    <AlertTriangleIcon className="inline w-4 h-4 mr-1" />
                    Note: Gemini API key is using a placeholder. For full functionality, set your API key in Settings.
                 </p>
            )}
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {error && (
        <div className="p-4 m-4 bg-red-800/50 border border-red-700 text-red-200 rounded-lg text-sm">
          <AlertTriangleIcon className="inline w-5 h-5 mr-2" />
          {error}
        </div>
      )}
      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};