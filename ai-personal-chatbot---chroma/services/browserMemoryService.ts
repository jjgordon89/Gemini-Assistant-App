// Browser-compatible memory service that fallbacks to localStorage when LanceDB is not available
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatRole } from '../types';

// Define the schema for our conversation entries
interface ConversationEntry {
  id: string;              // Unique identifier
  text: string;            // Message text
  embedding: number[];     // Vector embedding of the message
  role: string;            // USER or MODEL
  timestamp: string;       // ISO string timestamp
  userId?: string;         // Optional user identifier
  metadata?: Record<string, any>; // Additional metadata
}

interface SearchResult {
  entry: ConversationEntry;
  score: number;
}

class BrowserMemoryService {
  private static instance: BrowserMemoryService;
  private readonly storageKey = 'chroma_conversations';
  private isInitialized = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): BrowserMemoryService {
    if (!BrowserMemoryService.instance) {
      BrowserMemoryService.instance = new BrowserMemoryService();
    }
    return BrowserMemoryService.instance;
  }

  /**
   * Initialize the browser memory service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure localStorage is available
      if (typeof Storage === "undefined") {
        throw new Error('Browser storage is not supported');
      }
      
      // Initialize storage if it doesn't exist
      if (!localStorage.getItem(this.storageKey)) {
        localStorage.setItem(this.storageKey, JSON.stringify([]));
      }
      
      this.isInitialized = true;
      console.log('Browser memory service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize browser memory service:', error);
      throw error;
    }
  }

  /**
   * Store a message in browser memory
   */
  public async storeMessage(
    message: Message,
    embedding: number[] = [],
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    await this.initialize();    const entry: ConversationEntry = {
      id: uuidv4(),
      text: message.text,
      embedding: embedding.length > 0 ? embedding : this.generateDummyEmbedding(),
      role: message.sender,
      timestamp: message.timestamp ? message.timestamp.toISOString() : new Date().toISOString(),
      userId,
      metadata
    };

    try {
      const conversations = this.getStoredConversations();
      conversations.push(entry);
      localStorage.setItem(this.storageKey, JSON.stringify(conversations));
      
      console.log(`Stored message with ID: ${entry.id}`);
      return entry.id;
    } catch (error) {
      console.error('Failed to store message:', error);
      throw error;
    }
  }

  /**
   * Search for similar messages using simple text matching (fallback for embeddings)
   */
  public async searchSimilar(
    queryText: string,
    limit: number = 5,
    threshold: number = 0.7,
    userId?: string
  ): Promise<SearchResult[]> {
    await this.initialize();

    try {
      const conversations = this.getStoredConversations();
      const queryWords = queryText.toLowerCase().split(/\s+/);
      
      const results: SearchResult[] = conversations
        .filter(entry => !userId || entry.userId === userId)
        .map(entry => {
          const textWords = entry.text.toLowerCase().split(/\s+/);
          const commonWords = queryWords.filter(word => 
            textWords.some(textWord => textWord.includes(word) || word.includes(textWord))
          );
          const score = commonWords.length / Math.max(queryWords.length, textWords.length);
          
          return { entry, score };
        })
        .filter(result => result.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      console.log(`Found ${results.length} similar messages for query: "${queryText}"`);
      return results;
    } catch (error) {
      console.error('Failed to search for similar messages:', error);
      return [];
    }
  }

  /**
   * Get recent messages
   */
  public async getRecentMessages(
    limit: number = 10,
    userId?: string
  ): Promise<ConversationEntry[]> {
    await this.initialize();

    try {
      const conversations = this.getStoredConversations();
      
      return conversations
        .filter(entry => !userId || entry.userId === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent messages:', error);
      return [];
    }
  }

  /**
   * Delete messages older than specified days
   */
  public async cleanup(olderThanDays: number = 30): Promise<number> {
    await this.initialize();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const conversations = this.getStoredConversations();
      const initialCount = conversations.length;
      
      const filteredConversations = conversations.filter(entry => 
        new Date(entry.timestamp) > cutoffDate
      );
      
      localStorage.setItem(this.storageKey, JSON.stringify(filteredConversations));
      const deletedCount = initialCount - filteredConversations.length;
      
      console.log(`Cleaned up ${deletedCount} old messages`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old messages:', error);
      return 0;
    }
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

    try {
      const conversations = this.getStoredConversations();
      
      const userMessages = conversations.filter(entry => entry.role === ChatRole.USER).length;
      const modelMessages = conversations.filter(entry => entry.role === ChatRole.MODEL).length;
      
      const timestamps = conversations.map(entry => entry.timestamp).sort();
      
      return {
        totalMessages: conversations.length,
        userMessages,
        modelMessages,
        oldestMessage: timestamps[0],
        newestMessage: timestamps[timestamps.length - 1]
      };
    } catch (error) {
      console.error('Failed to get conversation stats:', error);
      return {
        totalMessages: 0,
        userMessages: 0,
        modelMessages: 0
      };
    }
  }

  /**
   * Clear all stored conversations
   */
  public async clearAll(): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
      console.log('Cleared all stored conversations');
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      throw error;
    }
  }

  /**
   * Export all conversations
   */
  public async exportConversations(): Promise<ConversationEntry[]> {
    await this.initialize();
    return this.getStoredConversations();
  }

  /**
   * Import conversations
   */
  public async importConversations(conversations: ConversationEntry[]): Promise<void> {
    await this.initialize();
    
    try {
      const existingConversations = this.getStoredConversations();
      const mergedConversations = [...existingConversations, ...conversations];
      
      // Remove duplicates based on ID
      const uniqueConversations = mergedConversations.filter((conv, index, self) =>
        index === self.findIndex(c => c.id === conv.id)
      );
      
      localStorage.setItem(this.storageKey, JSON.stringify(uniqueConversations));
      console.log(`Imported ${conversations.length} conversations`);
    } catch (error) {
      console.error('Failed to import conversations:', error);
      throw error;
    }
  }

  // Private helper methods
  private getStoredConversations(): ConversationEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse stored conversations:', error);
      return [];
    }
  }
  private generateDummyEmbedding(dimension: number = 384): number[] {
    // Generate a simple hash-based embedding for fallback
    return Array.from({ length: dimension }, () => Math.random() - 0.5);
  }
}

export default BrowserMemoryService;
