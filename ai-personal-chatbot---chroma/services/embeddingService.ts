import { Message, ChatRole } from '../types';

// Define the interface for embedding providers
export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
}

// Gemini embedding provider
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string = 'embedding-001';
  private apiUrl: string = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(
        `${this.apiUrl}/models/${this.model}:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            content: {
              parts: [{ text }]
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Embedding API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.embedding.values;
    } catch (error) {
      console.error('Error generating embedding with Gemini:', error);
      throw error;
    }
  }
}

// Mock embedding provider for testing or fallback
export class MockEmbeddingProvider implements EmbeddingProvider {
  private dimension: number;

  constructor(dimension: number = 768) {
    this.dimension = dimension;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    // Generate a deterministic pseudo-random embedding based on text content
    // This is NOT suitable for production but works for testing
    const embedding: number[] = [];
    let hash = 0;
    
    // Simple string hash function
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    
    // Use the hash as a seed for the embedding
    for (let i = 0; i < this.dimension; i++) {
      // Generate values between -1 and 1
      const value = Math.sin(hash * (i + 1)) / 2 + 0.5;
      embedding.push(value);
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
}

// Embedding service factory that creates the appropriate provider
export class EmbeddingService {
  private static instance: EmbeddingService;
  private provider: EmbeddingProvider;

  private constructor(provider: EmbeddingProvider) {
    this.provider = provider;
  }

  public static getInstance(apiKey?: string): EmbeddingService {
    if (!EmbeddingService.instance) {
      // Use Gemini if API key is provided, otherwise use mock
      const provider = apiKey ? 
        new GeminiEmbeddingProvider(apiKey) : 
        new MockEmbeddingProvider();
      
      EmbeddingService.instance = new EmbeddingService(provider);
    }
    return EmbeddingService.instance;
  }

  public async getEmbedding(text: string): Promise<number[]> {
    return this.provider.generateEmbedding(text);
  }

  // Helper to generate embeddings for chat messages
  public async embedMessage(message: Message): Promise<number[]> {
    return this.provider.generateEmbedding(message.text);
  }
}

export default EmbeddingService;