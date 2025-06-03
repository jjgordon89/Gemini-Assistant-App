import { connect } from 'lancedb';
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

// Configuration
const DB_PATH = './.lancedb';
const TABLE_NAME = 'conversations';
const EMBEDDING_DIM = 768;  // Dimension of embeddings (adjust based on your embedding model)

class LanceDBService {
  private static instance: LanceDBService;
  private dbConnection: any = null;
  private table: any = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): LanceDBService {
    if (!LanceDBService.instance) {
      LanceDBService.instance = new LanceDBService();
    }
    return LanceDBService.instance;
  }

  /**
   * Initialize the LanceDB connection and create table if it doesn't exist
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        console.log('Initializing LanceDB...');
        // Connect to the database
        this.dbConnection = await connect(DB_PATH);
        
        // Check if table exists
        const tables = await this.dbConnection.tableNames();
        
        if (tables.includes(TABLE_NAME)) {
          // Open existing table
          this.table = await this.dbConnection.openTable(TABLE_NAME);
          console.log('Opened existing LanceDB table:', TABLE_NAME);
        } else {
          // Create new table with schema
          const schema = {
            id: 'string',
            text: 'string',
            embedding: { type: 'fixed_size_list', length: EMBEDDING_DIM, children: { type: 'float' } },
            role: 'string',
            timestamp: 'string',
            userId: 'string', 
            metadata: 'json'
          };
          
          // Create an empty table with schema
          this.table = await this.dbConnection.createTable(TABLE_NAME, [], schema);
          console.log('Created new LanceDB table:', TABLE_NAME);
        }
        
        this.isInitialized = true;
        console.log('LanceDB initialization complete');
      } catch (error) {
        console.error('Failed to initialize LanceDB:', error);
        this.isInitialized = false;
        throw error;
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Ensure the database is initialized before performing operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Store a message with its embedding in the database
   * @param message The message to store
   * @param embedding The vector embedding for the message
   * @param userId Optional user identifier
   * @param additionalMetadata Any additional metadata to store
   * @returns The ID of the stored message
   */
  public async storeMessage(
    message: Message,
    embedding: number[],
    userId?: string,
    additionalMetadata?: Record<string, any>
  ): Promise<string> {
    await this.ensureInitialized();

    try {
      // Validate embedding dimensions
      if (embedding.length !== EMBEDDING_DIM) {
        throw new Error(`Embedding dimension mismatch. Expected ${EMBEDDING_DIM}, got ${embedding.length}`);
      }

      const id = message.id || uuidv4();
      
      const entry: ConversationEntry = {
        id,
        text: message.text,
        embedding,
        role: message.sender,
        timestamp: message.timestamp.toISOString(),
        userId,
        metadata: {
          ...additionalMetadata,
          ...message.metadata
        }
      };

      await this.table.add([entry]);
      console.log('Added message to LanceDB:', id);
      
      return id;
    } catch (error) {
      console.error('Error storing message in LanceDB:', error);
      throw error;
    }
  }

  /**
   * Find similar messages based on vector similarity
   * @param embedding The query embedding vector
   * @param limit Maximum number of results to return
   * @param threshold Similarity threshold (higher is more similar)
   * @param userId Optional filter by user ID
   * @returns Array of similar messages with their similarity scores
   */
  public async findSimilarMessages(
    embedding: number[],
    limit: number = 5,
    threshold: number = 0.7,
    userId?: string
  ): Promise<Array<{ message: Message; similarity: number }>> {
    await this.ensureInitialized();

    try {
      // Validate embedding dimensions
      if (embedding.length !== EMBEDDING_DIM) {
        throw new Error(`Embedding dimension mismatch. Expected ${EMBEDDING_DIM}, got ${embedding.length}`);
      }

      let query = this.table.search(embedding).limit(limit * 2);
      
      // Add filter by userId if provided
      if (userId) {
        query = query.where(`userId = '${userId}'`);
      }
      
      const results = await query.execute();
      
      // Convert results to Message objects and filter by threshold
      const messages = results
        .filter(result => result._distance <= (1 - threshold))
        .slice(0, limit)
        .map(result => {
          const message: Message = {
            id: result.id,
            text: result.text,
            sender: result.role as ChatRole,
            timestamp: new Date(result.timestamp),
            metadata: result.metadata
          };
          
          // Convert distance to similarity (0-1 range where 1 is most similar)
          const similarity = 1 - result._distance;
          
          return { message, similarity };
        });
      
      return messages;
    } catch (error) {
      console.error('Error searching similar messages in LanceDB:', error);
      throw error;
    }
  }

  /**
   * Get recent conversation history
   * @param limit Maximum number of messages to retrieve
   * @param userId Optional filter by user ID
   * @returns Array of recent messages
   */
  public async getRecentMessages(limit: number = 20, userId?: string): Promise<Message[]> {
    await this.ensureInitialized();

    try {
      let query = this.table;
      
      // Add filter by userId if provided
      if (userId) {
        query = query.where(`userId = '${userId}'`);
      }
      
      const results = await query.orderBy('timestamp', 'desc').limit(limit).execute();
      
      // Convert to Message objects and sort by timestamp (ascending)
      const messages = results
        .map(result => ({
          id: result.id,
          text: result.text,
          sender: result.role as ChatRole,
          timestamp: new Date(result.timestamp),
          metadata: result.metadata
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      return messages;
    } catch (error) {
      console.error('Error retrieving recent messages from LanceDB:', error);
      throw error;
    }
  }

  /**
   * Update an existing message
   * @param id The ID of the message to update
   * @param updates The updates to apply
   * @param newEmbedding Optional new embedding if text changed
   * @returns True if the update was successful
   */
  public async updateMessage(
    id: string,
    updates: Partial<Message>,
    newEmbedding?: number[]
  ): Promise<boolean> {
    await this.ensureInitialized();

    try {
      // Create update object based on provided updates
      const updateObj: Partial<ConversationEntry> = {};
      
      if (updates.text !== undefined) {
        updateObj.text = updates.text;
      }
      
      if (updates.sender !== undefined) {
        updateObj.role = updates.sender;
      }
      
      if (updates.timestamp !== undefined) {
        updateObj.timestamp = updates.timestamp.toISOString();
      }
      
      if (updates.metadata !== undefined) {
        updateObj.metadata = updates.metadata;
      }
      
      if (newEmbedding !== undefined) {
        // Validate embedding dimensions
        if (newEmbedding.length !== EMBEDDING_DIM) {
          throw new Error(`Embedding dimension mismatch. Expected ${EMBEDDING_DIM}, got ${newEmbedding.length}`);
        }
        updateObj.embedding = newEmbedding;
      }
      
      // If there are no updates, return early
      if (Object.keys(updateObj).length === 0) {
        return true;
      }
      
      // Execute the update - first get the existing entry
      const existingEntry = await this.table.where(`id = '${id}'`).execute();
      
      if (existingEntry.length === 0) {
        console.error(`Message with ID ${id} not found for update`);
        return false;
      }
      
      // Create a new entry with updated fields
      const updatedEntry = { ...existingEntry[0], ...updateObj };
      
      // Remove the entry and add the updated one (LanceDB doesn't have direct update)
      await this.table.delete(`id = '${id}'`);
      await this.table.add([updatedEntry]);
      
      console.log(`Updated message in LanceDB: ${id}`);
      return true;
    } catch (error) {
      console.error('Error updating message in LanceDB:', error);
      throw error;
    }
  }

  /**
   * Delete a message by ID
   * @param id The ID of the message to delete
   * @returns True if the deletion was successful
   */
  public async deleteMessage(id: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      await this.table.delete(`id = '${id}'`);
      console.log(`Deleted message from LanceDB: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting message from LanceDB:', error);
      throw error;
    }
  }

  /**
   * Delete messages by user ID
   * @param userId The user ID whose messages should be deleted
   * @returns The number of messages deleted
   */
  public async deleteUserMessages(userId: string): Promise<number> {
    await this.ensureInitialized();

    try {
      // Get count before deletion
      const countBefore = (await this.table.where(`userId = '${userId}'`).execute()).length;
      
      // Delete messages
      await this.table.delete(`userId = '${userId}'`);
      
      console.log(`Deleted all messages for user: ${userId}`);
      return countBefore;
    } catch (error) {
      console.error(`Error deleting messages for user ${userId} from LanceDB:`, error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (this.dbConnection) {
      try {
        // LanceDB doesn't have an explicit close method, but we can clear references
        this.table = null;
        this.dbConnection = null;
        this.isInitialized = false;
        console.log('LanceDB connection closed');
      } catch (error) {
        console.error('Error closing LanceDB connection:', error);
      }
    }
  }
}

export default LanceDBService;