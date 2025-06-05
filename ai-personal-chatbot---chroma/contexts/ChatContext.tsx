import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Message, ChatRole, AiProviderType } from '../types';
import { Chat } from '@google/genai';
import { ConversationMemoryService, AIProviderService } from '../services';

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  handleSendMessage: (text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ 
  children, 
  geminiChat, 
  selectedProvider,
  aiProviderService,
  memoryService,
  memoryEnabled,
  error: parentError,
  setError: setParentError
}: { 
  children: ReactNode; 
  geminiChat: Chat | null;
  selectedProvider: AiProviderType;
  aiProviderService: AIProviderService | null;
  memoryService: ConversationMemoryService | null;
  memoryEnabled: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);

  // Use parent error as source of truth, but allow local setting
  const setError = (err: React.SetStateAction<string | null>) => {
    setLocalError(err);
    setParentError(err);
  };

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
        }      } else {
        // Handle other AI providers using the new service
        if (!aiProviderService) {
          throw new Error(`${selectedProvider} service is not initialized. Check API Key.`);
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

        try {
          // Use streaming if available
          const stream = aiProviderService.sendMessageStream(text, memoryContext);
          for await (const chunk of stream) {
            accumulatedResponse += chunk;
            setMessages(prev => prev.map(msg => 
              msg.id === 'ai-typing' ? { ...msg, text: accumulatedResponse } : msg
            ));
          }
        } catch (streamError) {
          console.warn("Streaming failed, falling back to regular message:", streamError);
          // Fallback to regular message if streaming fails
          accumulatedResponse = await aiProviderService.sendMessage(text, memoryContext);
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

  const value = {
    messages,
    setMessages,
    isLoading,
    error: error || parentError,
    setError,
    handleSendMessage
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}