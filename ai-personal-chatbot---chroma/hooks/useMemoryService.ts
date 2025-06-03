import { useState, useEffect } from 'react';
import ConversationMemoryService from '../services/conversationMemoryService';
import { EmbeddingService, MockEmbeddingProvider } from '../services/embeddingService'; // Import necessary classes

/**
 * Custom hook to initialize and manage the conversation memory service
 * @param geminiApiKey API key to use for Gemini embeddings (optional)
 * @returns The memory service instance, error state, initialization status, and mock usage status
 */
export function useMemoryService(geminiApiKey?: string) {
  const [memoryService, setMemoryService] = useState<ConversationMemoryService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isUsingMockEmbeddings, setIsUsingMockEmbeddings] = useState<boolean>(false);

  useEffect(() => {
    const initializeMemory = async () => {
      try {
        setIsInitializing(true);
        setError(null); // Clear previous errors

        // Initialize memory service with API key for embeddings
        // This will also initialize EmbeddingService.getInstance(geminiApiKey) internally
        const memory = ConversationMemoryService.getInstance(geminiApiKey);
        await memory.initialize();
        setMemoryService(memory);
        
        // Check if the embedding service is using a mock provider
        // This relies on EmbeddingService and ConversationMemoryService instances being updated correctly
        const currentEmbeddingService = EmbeddingService.getInstance(geminiApiKey); // Get current instance
        if (currentEmbeddingService.provider instanceof MockEmbeddingProvider) {
          setIsUsingMockEmbeddings(true);
          console.warn("useMemoryService: Using MockEmbeddingProvider. Configure Gemini API key for full functionality.");
        } else {
          setIsUsingMockEmbeddings(false);
        }

        console.log("Memory service initialized. Using mock embeddings:", isUsingMockEmbeddings);
      } catch (err) {
        console.error("Failed to initialize memory service:", err);
        setError("Failed to initialize memory service. Some features may be unavailable.");
        setIsUsingMockEmbeddings(true); // Assume mock or non-functional state on error
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeMemory();
    
    // Cleanup on unmount
    return () => {
      // memoryService instance is captured by the closure here.
      // If a new memoryService instance is created due to API key change,
      // this cleanup will run for the *previous* instance.
      // This should be fine as close() is idempotent or handles already closed state.
      memoryService?.close().catch(err => {
          console.error("Error closing memory service:", err);
      });
    };
  }, [geminiApiKey]); // Ensure re-initialization if geminiApiKey changes

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
    isUsingMockEmbeddings, // Expose this status
    setUserId,
    clearUserMemory
  };
}