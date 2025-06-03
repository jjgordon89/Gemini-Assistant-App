import { useState, useEffect } from 'react';
import ConversationMemoryService from '../services/conversationMemoryService';

/**
 * Custom hook to initialize and manage the conversation memory service
 * @param apiKey API key to use for embeddings (optional)
 * @returns The memory service instance and error state
 */
export function useMemoryService(apiKey?: string) {
  const [memoryService, setMemoryService] = useState<ConversationMemoryService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeMemory = async () => {
      try {
        setIsInitializing(true);
        // Initialize memory service with API key for embeddings
        const memory = ConversationMemoryService.getInstance(apiKey);
        await memory.initialize();
        setMemoryService(memory);
        setError(null);
        
        console.log("Memory service initialized");
      } catch (err) {
        console.error("Failed to initialize memory service:", err);
        setError("Failed to initialize memory service. Some features may be unavailable.");
      } finally {
        setIsInitializing(false);
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
  }, [apiKey]);

  /**
   * Set the user ID for the memory service
   */
  const setUserId = (userId: string | null) => {
    if (memoryService) {
      memoryService.setUserId(userId);
    }
  };

  /**
   * Clear the user's memory
   */
  const clearUserMemory = async () => {
    if (!memoryService) {
      throw new Error("Memory service not initialized");
    }
    
    return memoryService.clearUserMemory();
  };

  return { 
    memoryService, 
    error, 
    isInitializing,
    setUserId,
    clearUserMemory
  };
}