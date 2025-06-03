import LanceDBService from './lanceDBService';
import EmbeddingService from './embeddingService';
import { Message, ChatRole } from '../types';

/**
 * Service to manage conversation memory using LanceDB and embeddings
 */
class ConversationMemoryService {
  private static instance: ConversationMemoryService;
  private lanceDB: LanceDBService;
  private embeddingService: EmbeddingService;
  private userId: string | null = null;
  
  private constructor(apiKey?: string) {
    this.lanceDB = LanceDBService.getInstance();
    this.embeddingService = EmbeddingService.getInstance(apiKey);
  }

  /**
   * Get the singleton instance of ConversationMemoryService
   */
  public static getInstance(apiKey?: string): ConversationMemoryService {
    if (!ConversationMemoryService.instance) {
      ConversationMemoryService.instance = new ConversationMemoryService(apiKey);
    }
    return ConversationMemoryService.instance;
  }

  /**
   * Initialize the memory service
   */
  public async initialize(): Promise<void> {
    await this.lanceDB.initialize();
  }

  /**
   * Set the current user ID for operations
   */
  public setUserId(userId: string | null): void {
    this.userId = userId;
  }

  /**
   * Store a message in memory with its embedding
   */
  public async storeMessage(message: Message): Promise<string> {
    const embedding = await this.embeddingService.embedMessage(message);
    return this.lanceDB.storeMessage(message, embedding, this.userId);
  }

  /**
   * Store multiple messages in memory
   */
  public async storeMessages(messages: Message[]): Promise<string[]> {
    const promises = messages.map(message => this.storeMessage(message));
    return Promise.all(promises);
  }

  /**
   * Retrieve recent conversation history
   */
  public async getRecentHistory(limit: number = 20): Promise<Message[]> {
    return this.lanceDB.getRecentMessages(limit, this.userId);
  }

  /**
   * Find similar messages to a query
   */
  public async findSimilarMessages(
    query: string, 
    limit: number = 5, 
    threshold: number = 0.7
  ): Promise<Array<{ message: Message; similarity: number }>> {
    const embedding = await this.embeddingService.getEmbedding(query);
    return this.lanceDB.findSimilarMessages(embedding, limit, threshold, this.userId);
  }

  /**
   * Generate contextual memory for a query
   * This creates a formatted string with relevant past conversations
   */
  public async generateContextualMemory(
    query: string,
    maxResults: number = 3,
    threshold: number = 0.7
  ): Promise<string> {
    const similarMessages = await this.findSimilarMessages(query, maxResults, threshold);
    
    if (similarMessages.length === 0) {
      return "No relevant past conversations found.";
    }
    
    // Group messages by similarity to create conversation clusters
    const memory = similarMessages.map(({ message, similarity }) => {
      const role = message.sender === ChatRole.USER ? "User" : "AI";
      const formattedDate = message.timestamp.toLocaleString();
      const similarityPercent = Math.round(similarity * 100);
      
      return `[${formattedDate}] ${role}: ${message.text} (Relevance: ${similarityPercent}%)`;
    }).join('\n\n');
    
    return `Relevant past conversations:\n\n${memory}`;
  }

  /**
   * Clear all memory for the current user
   */
  public async clearUserMemory(): Promise<number> {
    if (!this.userId) {
      throw new Error('No user ID set for memory operations');
    }
    
    return this.lanceDB.deleteUserMessages(this.userId);
  }

  /**
   * Close the memory service connections
   */
  public async close(): Promise<void> {
    await this.lanceDB.close();
  }
}

export default ConversationMemoryService;