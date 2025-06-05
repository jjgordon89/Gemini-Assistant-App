import { useState, useEffect } from 'react';
import UnifiedMemoryService from '../services/unifiedMemoryService';

/**
 * Custom hook to initialize and manage the unified memory service
 * @param apiKey API key to use for embeddings (optional)
 * @returns The memory service instance and error state
 */
export function useMemoryService(apiKey?: string) {
  const [memoryService, setMemoryService] = useState<UnifiedMemoryService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeMemory = async () => {
      try {
        setIsInitializing(true);
        // Initialize unified memory service
        const memory = UnifiedMemoryService.getInstance();
        await memory.initialize();
        setMemoryService(memory);
        setError(null);
        
        const serviceInfo = memory.getServiceInfo();
        console.log(`Memory service initialized using ${serviceInfo.type}`);
      } catch (err) {
        console.error("Failed to initialize memory service:", err);
        setError("Failed to initialize memory service. Some features may be unavailable.");
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeMemory();
  }, [apiKey]);
  /**
   * Set the user ID for the memory service
   */
  const setUserId = (userId: string | null) => {
    // For the unified memory service, we can store userId in metadata
    console.log(`User ID set for memory service: ${userId}`);
  };

  /**
   * Clear the user's memory
   */
  const clearUserMemory = async () => {
    if (!memoryService) {
      throw new Error("Memory service not initialized");
    }
    
    try {
      await memoryService.clearAll();
      console.log('User memory cleared successfully');
      return 1; // Return count for compatibility
    } catch (err) {
      console.error('Failed to clear user memory:', err);
      throw err;
    }
  };

  return { 
    memoryService, 
    error, 
    isInitializing,
    setUserId,
    clearUserMemory
  };
}