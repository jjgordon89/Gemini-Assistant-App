import { useState, useEffect } from 'react';
import { Message, ChatRole, AiProviderType } from '../types';
import { Chat } from '@google/genai';
import { 
  AIProviderService, 
  UnifiedMemoryService, 
  ConversationPersistenceService,
  AdvancedRAGService 
} from '../services';

/**
 * Enhanced hook to manage chat messages with advanced features
 * @param geminiChat Gemini chat instance
 * @param selectedProvider Current AI provider
 * @param aiProviderService AI provider service instance
 * @param memoryService Memory service instance
 * @param memoryEnabled Whether memory is enabled
 * @returns Message state and functions
 */
export function useChatMessages(
  geminiChat: Chat | null,
  selectedProvider: AiProviderType,
  aiProviderService: AIProviderService | null,
  memoryService: UnifiedMemoryService | null,
  memoryEnabled: boolean
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistenceService] = useState(() => ConversationPersistenceService.getInstance());
  const [ragService] = useState(() => AdvancedRAGService.getInstance());

  // Initialize persistence service
  useEffect(() => {
    const initializePersistence = async () => {
      try {
        await persistenceService.initialize();
        
        // Load current session messages if available
        const currentSession = persistenceService.getCurrentSession();
        if (currentSession) {
          const sessionMessages = await persistenceService.getSessionMessages(currentSession.id, 20);
          setMessages(sessionMessages);
        }
      } catch (err) {
        console.error('Failed to initialize persistence service:', err);
      }
    };

    initializePersistence();
  }, [persistenceService]);  /**
   * Store a message in memory and persistence if enabled
   */
  const storeMessageInMemory = async (message: Message) => {
    if (!memoryEnabled) return;
    
    try {
      // Store in unified memory service
      if (memoryService) {
        await memoryService.storeMessage(message);
      }
      
      // Store in persistence service for session management
      await persistenceService.addMessageToSession(message);
    } catch (err) {
      console.error("Failed to store message in memory:", err);
    }
  };

  /**
   * Get enhanced context using multiple services
   */
  const getEnhancedContext = async (text: string): Promise<string> => {
    if (!memoryEnabled) return "";
    
    try {
      let context = "";
      
      // Get memory context from unified memory service
      if (memoryService) {
        const similarMessages = await memoryService.searchSimilar(text, 3, 0.6);
        if (similarMessages.length > 0) {
          const memoryContext = similarMessages
            .map(result => `Previous: ${result.entry.text}`)
            .join('\n');
          context += `Memory Context:\n${memoryContext}\n\n`;
        }
      }
      
      // Get RAG context from chunked documents
      const ragResults = ragService.searchChunks(text, undefined, 3, 0.3);
      if (ragResults.length > 0) {
        const ragContext = ragResults
          .map(result => `Document: ${result.chunk.text} (${result.relevanceReason})`)
          .join('\n');
        context += `Document Context:\n${ragContext}\n\n`;
      }
      
      // Get cross-session context
      const crossSessionResults = await persistenceService.searchAcrossSessions(text, 2);
      if (crossSessionResults.length > 0) {
        const sessionContext = crossSessionResults
          .map(result => `Past Session "${result.sessionTitle}": ${result.message.text}`)
          .join('\n');
        context += `Previous Sessions:\n${sessionContext}`;
      }
      
      return context;
    } catch (err) {
      console.error("Failed to retrieve enhanced context:", err);
      return "";
    }
  };  /**
   * Handle sending a message with the Gemini provider
   */
  const handleGeminiMessage = async (text: string) => {
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
    }]);    // Get enhanced context if available
    const enhancedContext = await getEnhancedContext(text);

    // Process the stream
    const stream = await geminiChat.sendMessageStream({
      message: enhancedContext ? 
        `${text}\n\nContext:\n${enhancedContext}` : 
        text
    });
    for await (const chunk of stream) {
      accumulatedResponse += chunk.text;
      setMessages(prev => prev.map(msg => 
        msg.id === 'ai-typing' ? { ...msg, text: accumulatedResponse } : msg
      ));
    }
    
    // Create the final AI response
    const aiResponseMessage: Message = {
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
  };  /**
   * Handle sending a message with other providers
   */
  const handleOtherProviderMessage = async (text: string) => {
    if (!aiProviderService) {
      throw new Error(`${selectedProvider} service is not initialized. Check API Key.`);
    }
    
    let accumulatedResponse = "";
    setMessages(prev => [...prev, { 
      id: 'ai-typing', 
      text: '', 
      sender: ChatRole.MODEL, 
      timestamp: new Date(), 
      streaming: true 
    }]);

    // Get enhanced context if available
    const enhancedContext = await getEnhancedContext(text);

    try {
      // Try streaming first
      const stream = aiProviderService.sendMessageStream(text, enhancedContext);
      for await (const chunk of stream) {
        accumulatedResponse += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === 'ai-typing' ? { ...msg, text: accumulatedResponse } : msg
        ));
      }
    } catch (streamError) {
      console.warn("Streaming failed, falling back to regular message:", streamError);
      // Fallback to regular message if streaming fails
      accumulatedResponse = await aiProviderService.sendMessage(text, enhancedContext);
      setMessages(prev => prev.map(msg => 
        msg.id === 'ai-typing' ? { ...msg, text: accumulatedResponse } : msg
      ));
    }
    
    const aiResponseMessage: Message = {
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
    await storeMessageInMemory(aiResponseMessage);
    
    return aiResponseMessage;
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
        await handleGeminiMessage(text);
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

  /**
   * Clear all messages and start fresh
   */
  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  /**
   * Load messages from a specific session
   */
  const loadSession = async (sessionId: string) => {
    try {
      const sessionMessages = await persistenceService.getSessionMessages(sessionId, 50);
      setMessages(sessionMessages);
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load session');
    }
  };

  return {
    messages,
    setMessages,
    isLoading,
    error,
    setError,
    sendMessage,
    clearMessages,
    loadSession,
    storeMessageInMemory,
    getEnhancedContext
  };
}