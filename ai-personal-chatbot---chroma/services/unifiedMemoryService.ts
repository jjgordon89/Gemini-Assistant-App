// Unified memory service that switches between LanceDB and browser storage
import { Message, ChatRole } from '../types';
import BrowserMemoryService from './browserMemoryService';

// Define the schema for conversation entries
interface ConversationEntry {
  id: string;
  text: string;
  embedding: number[];
  role: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface SearchResult {
  entry: ConversationEntry;
  score: number;
}

class UnifiedMemoryService {
  private static instance: UnifiedMemoryService;
  private memoryService: any = null;
  private isInitialized = false;
  private isLanceDBAvailable = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): UnifiedMemoryService {
    if (!UnifiedMemoryService.instance) {
      UnifiedMemoryService.instance = new UnifiedMemoryService();
    }
    return UnifiedMemoryService.instance;
  }

  /**
   * Initialize the appropriate memory service based on environment
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if we're in a browser environment or if LanceDB is available
      const isBrowser = typeof window !== 'undefined';
      
      if (isBrowser) {
        console.log('Initializing browser memory service...');
        this.memoryService = BrowserMemoryService.getInstance();
        this.isLanceDBAvailable = false;
      } else {
        // Try to use LanceDB in Node.js environment
        try {
          const { default: LanceDBService } = await import('./lanceDBService');
          this.memoryService = LanceDBService.getInstance();
          this.isLanceDBAvailable = true;
          console.log('Initializing LanceDB service...');
        } catch (lanceError) {
          console.warn('LanceDB not available, falling back to browser storage:', lanceError);
          this.memoryService = BrowserMemoryService.getInstance();
          this.isLanceDBAvailable = false;
        }
      }

      await this.memoryService.initialize();
      this.isInitialized = true;
      
      console.log(`Memory service initialized successfully (${this.isLanceDBAvailable ? 'LanceDB' : 'Browser Storage'})`);
    } catch (error) {
      console.error('Failed to initialize memory service:', error);
      throw error;
    }
  }

  /**
   * Store a message in memory
   */
  public async storeMessage(
    message: Message,
    embedding: number[] = [],
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    await this.initialize();
    return this.memoryService.storeMessage(message, embedding, userId, metadata);
  }

  /**
   * Search for similar messages
   */
  public async searchSimilar(
    queryText: string,
    limit: number = 5,
    threshold: number = 0.7,
    userId?: string
  ): Promise<SearchResult[]> {
    await this.initialize();
    return this.memoryService.searchSimilar(queryText, limit, threshold, userId);
  }

  /**
   * Get recent messages
   */
  public async getRecentMessages(
    limit: number = 10,
    userId?: string
  ): Promise<ConversationEntry[]> {
    await this.initialize();
    return this.memoryService.getRecentMessages(limit, userId);
  }

  /**
   * Delete messages older than specified days
   */
  public async cleanup(olderThanDays: number = 30): Promise<number> {
    await this.initialize();
    return this.memoryService.cleanup(olderThanDays);
  }

  /**
   * Get conversation statistics
   */
  public async getStats(): Promise<{
    totalMessages: number;
    userMessages: number;
    modelMessages: number;
    oldestMessage?: string;
    newestMessage?: string;
  }> {
    await this.initialize();
    return this.memoryService.getStats();
  }

  /**
   * Clear all stored conversations
   */
  public async clearAll(): Promise<void> {
    await this.initialize();
    return this.memoryService.clearAll();
  }

  /**
   * Export all conversations
   */
  public async exportConversations(): Promise<ConversationEntry[]> {
    await this.initialize();
    return this.memoryService.exportConversations();
  }

  /**
   * Import conversations
   */
  public async importConversations(conversations: ConversationEntry[]): Promise<void> {
    await this.initialize();
    return this.memoryService.importConversations(conversations);
  }

  /**
   * Check if LanceDB is available
   */
  public isUsingLanceDB(): boolean {
    return this.isLanceDBAvailable;
  }

  /**
   * Get service type information
   */
  public getServiceInfo(): { type: string; isLanceDBAvailable: boolean } {
    return {
      type: this.isLanceDBAvailable ? 'LanceDB' : 'Browser Storage',
      isLanceDBAvailable: this.isLanceDBAvailable
    };
  }
}

export default UnifiedMemoryService;
