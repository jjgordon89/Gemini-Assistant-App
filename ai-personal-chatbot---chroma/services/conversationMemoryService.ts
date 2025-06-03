import LanceDBService from './lanceDBService';
import EmbeddingService from './embeddingService';
import { Message, ChatRole } from '../types';

/**
 * Service to manage conversation memory using LanceDB and embeddings
 */
class ConversationMemoryService {
  private static instance: ConversationMemoryService;
  private static currentApiKey?: string;
  private lanceDB: LanceDBService;
  public embeddingService: EmbeddingService; // Made public to check type
  private userId: string | null = null;
  
  private constructor(apiKey?: string) {
    this.lanceDB = LanceDBService.getInstance();
    // Crucially, pass the apiKey to EmbeddingService.getInstance
    this.embeddingService = EmbeddingService.getInstance(apiKey);
  }

  /**
   * Get the singleton instance of ConversationMemoryService
   */
  public static getInstance(apiKey?: string): ConversationMemoryService {
    if (!ConversationMemoryService.instance || ConversationMemoryService.currentApiKey !== apiKey) {
      console.log(`ConversationMemoryService: Re-initializing with API key status change. Old key: ${ConversationMemoryService.currentApiKey}, New key: ${apiKey}`);
      ConversationMemoryService.instance = new ConversationMemoryService(apiKey);
      ConversationMemoryService.currentApiKey = apiKey;
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
   * Get the current user ID
   */
  public getUserId(): string | null {
    return this.userId;
  }

  /**
   * Store a message in memory with its embedding
   */
  public async storeMessage(message: Message): Promise<string> {
    const embedding = await this.createEmbedding(message);
    return this.saveMessageToDb(message, embedding);
  }

  /**
   * Create an embedding for a message
   */
  private async createEmbedding(message: Message): Promise<number[]> {
    return this.embeddingService.embedMessage(message);
  }

  /**
   * Save a message with its embedding to the database
   */
  private async saveMessageToDb(message: Message, embedding: number[]): Promise<string> {
    return this.lanceDB.storeMessage(message, embedding, this.userId);
  }

  /**
   * Store multiple messages in memory
   */
  public async storeMessages(messages: Message[]): Promise<string[]> {
    const storePromises = messages.map(message => this.storeMessage(message));
    return Promise.all(storePromises);
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
   * Format similar messages as a readable memory context
   */
  private formatMemoryContext(similarMessages: Array<{ message: Message; similarity: number }>): string {
    if (similarMessages.length === 0) {
      return "No relevant past conversations found.";
    }
    
    const formattedMessages = similarMessages.map(({ message, similarity }) => {
      const role = message.sender === ChatRole.USER ? "User" : "AI";
      const formattedDate = message.timestamp.toLocaleString();
      const similarityPercent = Math.round(similarity * 100);
      
      return `[${formattedDate}] ${role}: ${message.text} (Relevance: ${similarityPercent}%)`;
    }).join('\n\n');
    
    return `Relevant past conversations:\n\n${formattedMessages}`;
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
    return this.formatMemoryContext(similarMessages);
  }

  /**
   * Validate that a user ID is set before performing user-specific operations
   */
  private validateUserIdIsSet(): void {
    if (!this.userId) {
      throw new Error('No user ID set for memory operations');
    }
  }

  /**
   * Clear all memory for the current user
   */
  public async clearUserMemory(): Promise<number> {
    this.validateUserIdIsSet();
    return this.lanceDB.deleteUserMessages(this.userId!);
  }

  /**
   * Close the memory service connections
   */
  public async close(): Promise<void> {
    await this.lanceDB.close();
  }
}

export default ConversationMemoryService;