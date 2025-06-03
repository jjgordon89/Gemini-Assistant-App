import { useState } from 'react';
import { Message, ChatRole, AiProviderType } from '../types';
import { Chat } from '@google/genai';
import { ConversationMemoryService } from '../services';

/**
 * Custom hook to manage chat messages and message sending
 * @param geminiChat Gemini chat instance
 * @param selectedProvider Current AI provider
 * @param memoryService Memory service instance
 * @param memoryEnabled Whether memory is enabled
 * @returns Message state and functions
 */
export function useChatMessages(
  geminiChat: Chat | null,
  selectedProvider: AiProviderType,
  memoryService: ConversationMemoryService | null,
  memoryEnabled: boolean
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Store a message in memory if memory service is available and enabled
   */
  const storeMessageInMemory = async (message: Message) => {
    if (!memoryService || !memoryEnabled) return;
    
    try {
      await memoryService.storeMessage(message);
    } catch (err) {
      console.error("Failed to store message in memory:", err);
    }
  };

  /**
   * Get memory context for a message if memory service is available and enabled
   */
  const getMemoryContext = async (text: string): Promise<string> => {
    if (!memoryService || !memoryEnabled) return "";
    
    try {
      const context = await memoryService.generateContextualMemory(text, 3, 0.7);
      console.log("Memory context:", context);
      return context;
    } catch (err) {
      console.error("Failed to retrieve memory context:", err);
      return "";
    }
  };

  /**
   * Handle sending a message with the Gemini provider
   */
  const handleGeminiMessage = async (text: string, userMessage: Message) => {
    if (!geminiChat) {
      throw new Error("Gemini chat is not initialized. Check API Key.");
    }
    
    let accumulatedResponse = "";
    setMessages(prev => [...prev, { 
      id: 'ai-typing', 
      text: '', 
      sender: ChatRole.MODEL, 
      timestamp: new Date(), 
      streaming: true 
    }]);

    // Get memory context if available
    const memoryContext = await getMemoryContext(text);

    // Add memory context to the message if available
    const messageWithContext = memoryContext ? 
      { message: text, context: memoryContext } : 
      { message: text };

    // Process the stream
    const stream = await geminiChat.sendMessageStream(messageWithContext);
    for await (const chunk of stream) {
      accumulatedResponse += chunk.text;
      setMessages(prev => prev.map(msg => 
        msg.id === 'ai-typing' ? { ...msg, text: accumulatedResponse } : msg
      ));
    }
    
    // Create the final AI response
    const aiResponseMessage = {
      id: Date.now().toString() + '-ai', 
      streaming: false, 
      text: accumulatedResponse, 
      sender: ChatRole.MODEL,
      timestamp: new Date()
    };
    
    // Replace the streaming message with the final message
    setMessages(prev => prev.map(msg => 
        msg.id === 'ai-typing' ? aiResponseMessage : msg
    ));
    
    // Store AI response in memory
    await storeMessageInMemory(aiResponseMessage);
    
    return aiResponseMessage;
  };

  /**
   * Handle sending a message with other providers (placeholder)
   */
  const handleOtherProviderMessage = async (text: string) => {
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
    await storeMessageInMemory(aiResponse);
    
    return aiResponse;
  };

  /**
   * Send a message and get a response
   */
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      text, 
      sender: ChatRole.USER, 
      timestamp: new Date() 
    };
    
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Store user message in memory
      await storeMessageInMemory(newUserMessage);
      
      // Process based on provider
      if (selectedProvider === AiProviderType.GEMINI) {
        await handleGeminiMessage(text, newUserMessage);
      } else {
        await handleOtherProviderMessage(text);
      }
    } catch (e) {
      console.error("Error sending message:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to get response: ${errorMessage}`);
      setMessages(prevMessages => [...prevMessages, {
        id: Date.now().toString() + '-error', 
        text: `Error: ${errorMessage}`, 
        sender: ChatRole.MODEL, 
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.filter(msg => !(msg.id === 'ai-typing' && msg.text === '')));
    }
  };

  return {
    messages,
    setMessages,
    isLoading,
    error,
    setError,
    sendMessage
  };
}