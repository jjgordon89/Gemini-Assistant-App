// Advanced RAG Capabilities Service
// Provides enhanced chunking strategies and relevance scoring

export interface TextChunk {
  id: string;
  text: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    startPosition: number;
    endPosition: number;
    overlap?: number;
  };
  embedding?: number[];
}

export interface ChunkingOptions {
  maxChunkSize: number;
  overlap: number;
  strategy: 'fixed' | 'sentence' | 'paragraph' | 'semantic';
  preserveStructure: boolean;
}

export interface SearchResult {
  chunk: TextChunk;
  score: number;
  relevanceReason?: string;
}

export class AdvancedRAGService {
  private static instance: AdvancedRAGService;
  private chunks: Map<string, TextChunk[]> = new Map();

  private constructor() {}

  public static getInstance(): AdvancedRAGService {
    if (!AdvancedRAGService.instance) {
      AdvancedRAGService.instance = new AdvancedRAGService();
    }
    return AdvancedRAGService.instance;
  }

  /**
   * Advanced text chunking with multiple strategies
   */
  public chunkText(
    text: string,
    source: string,
    options: ChunkingOptions = {
      maxChunkSize: 1000,
      overlap: 100,
      strategy: 'sentence',
      preserveStructure: true
    }
  ): TextChunk[] {
    switch (options.strategy) {
      case 'fixed':
        return this.fixedSizeChunking(text, source, options);
      case 'sentence':
        return this.sentenceBasedChunking(text, source, options);
      case 'paragraph':
        return this.paragraphBasedChunking(text, source, options);
      case 'semantic':
        return this.semanticChunking(text, source, options);
      default:
        return this.sentenceBasedChunking(text, source, options);
    }
  }

  /**
   * Fixed-size chunking with overlap
   */
  private fixedSizeChunking(text: string, source: string, options: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { maxChunkSize, overlap } = options;
    let startPosition = 0;
    let chunkIndex = 0;

    while (startPosition < text.length) {
      const endPosition = Math.min(startPosition + maxChunkSize, text.length);
      const chunkText = text.slice(startPosition, endPosition);

      chunks.push({
        id: `${source}_chunk_${chunkIndex}`,
        text: chunkText,
        metadata: {
          source,
          chunkIndex,
          totalChunks: 0, // Will be updated after all chunks are created
          startPosition,
          endPosition,
          overlap
        }
      });

      startPosition = endPosition - overlap;
      chunkIndex++;
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    this.chunks.set(source, chunks);
    return chunks;
  }

  /**
   * Sentence-based chunking with smart boundaries
   */
  private sentenceBasedChunking(text: string, source: string, options: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { maxChunkSize, overlap } = options;
    
    // Split into sentences using multiple delimiters
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentStartPosition = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
        // Create chunk
        const endPosition = currentStartPosition + currentChunk.length;
        chunks.push({
          id: `${source}_chunk_${chunkIndex}`,
          text: currentChunk.trim(),
          metadata: {
            source,
            chunkIndex,
            totalChunks: 0,
            startPosition: currentStartPosition,
            endPosition,
            overlap
          }
        });

        // Start new chunk with overlap
        currentChunk = this.getOverlapText(currentChunk, overlap) + ' ' + sentence;
        currentStartPosition = endPosition - overlap;
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk if there's remaining text
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${source}_chunk_${chunkIndex}`,
        text: currentChunk.trim(),
        metadata: {
          source,
          chunkIndex,
          totalChunks: 0,
          startPosition: currentStartPosition,
          endPosition: currentStartPosition + currentChunk.length,
          overlap
        }
      });
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    this.chunks.set(source, chunks);
    return chunks;
  }

  /**
   * Paragraph-based chunking
   */
  private paragraphBasedChunking(text: string, source: string, options: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { maxChunkSize, overlap } = options;
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let currentStartPosition = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

      if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
        // Create chunk
        const endPosition = currentStartPosition + currentChunk.length;
        chunks.push({
          id: `${source}_chunk_${chunkIndex}`,
          text: currentChunk.trim(),
          metadata: {
            source,
            chunkIndex,
            totalChunks: 0,
            startPosition: currentStartPosition,
            endPosition,
            overlap
          }
        });

        // Start new chunk
        currentChunk = paragraph;
        currentStartPosition = endPosition;
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${source}_chunk_${chunkIndex}`,
        text: currentChunk.trim(),
        metadata: {
          source,
          chunkIndex,
          totalChunks: 0,
          startPosition: currentStartPosition,
          endPosition: currentStartPosition + currentChunk.length,
          overlap
        }
      });
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    this.chunks.set(source, chunks);
    return chunks;
  }

  /**
   * Semantic chunking (simplified version using topic boundaries)
   */
  private semanticChunking(text: string, source: string, options: ChunkingOptions): TextChunk[] {
    // For now, fall back to sentence-based chunking
    // In a full implementation, this would use topic modeling or semantic similarity
    return this.sentenceBasedChunking(text, source, options);
  }

  /**
   * Enhanced relevance scoring with multiple factors
   */
  public calculateRelevanceScore(query: string, chunk: TextChunk): number {
    const queryWords = this.tokenize(query.toLowerCase());
    const chunkWords = this.tokenize(chunk.text.toLowerCase());
    
    // 1. Keyword overlap score
    const keywordScore = this.calculateKeywordOverlap(queryWords, chunkWords);
    
    // 2. Proximity score (how close keywords appear to each other)
    const proximityScore = this.calculateProximityScore(queryWords, chunk.text.toLowerCase());
    
    // 3. Length normalization
    const lengthScore = Math.min(chunk.text.length / 500, 1); // Prefer chunks around 500 chars
    
    // 4. Position score (earlier chunks might be more relevant)
    const positionScore = 1 - (chunk.metadata.chunkIndex / chunk.metadata.totalChunks) * 0.2;
    
    // Combined score with weights
    const totalScore = (
      keywordScore * 0.4 +
      proximityScore * 0.3 +
      lengthScore * 0.1 +
      positionScore * 0.2
    );
    
    return Math.min(totalScore, 1.0);
  }

  /**
   * Search chunks with enhanced scoring
   */
  public searchChunks(
    query: string,
    source?: string,
    limit: number = 5,
    threshold: number = 0.1
  ): SearchResult[] {
    const results: SearchResult[] = [];
    
    const chunksToSearch = source ? 
      (this.chunks.get(source) || []) : 
      Array.from(this.chunks.values()).flat();

    for (const chunk of chunksToSearch) {
      const score = this.calculateRelevanceScore(query, chunk);
      
      if (score >= threshold) {
        results.push({
          chunk,
          score,
          relevanceReason: this.generateRelevanceReason(query, chunk, score)
        });
      }
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Helper methods
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text;
    return text.slice(-overlapSize);
  }

  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(word => word.length > 0);
  }

  private calculateKeywordOverlap(queryWords: string[], chunkWords: string[]): number {
    const querySet = new Set(queryWords);
    const chunkSet = new Set(chunkWords);
    const intersection = new Set([...querySet].filter(word => chunkSet.has(word)));
    
    return querySet.size > 0 ? intersection.size / querySet.size : 0;
  }

  private calculateProximityScore(queryWords: string[], chunkText: string): number {
    let proximityScore = 0;
    const words = chunkText.split(/\s+/);
    
    for (let i = 0; i < queryWords.length - 1; i++) {
      const word1Index = words.indexOf(queryWords[i]);
      const word2Index = words.indexOf(queryWords[i + 1]);
      
      if (word1Index !== -1 && word2Index !== -1) {
        const distance = Math.abs(word2Index - word1Index);
        proximityScore += 1 / (1 + distance * 0.1); // Closer words get higher scores
      }
    }
    
    return queryWords.length > 1 ? proximityScore / (queryWords.length - 1) : 0;
  }

  private generateRelevanceReason(query: string, chunk: TextChunk, score: number): string {
    const queryWords = this.tokenize(query.toLowerCase());
    const chunkWords = this.tokenize(chunk.text.toLowerCase());
    const matchingWords = queryWords.filter(word => chunkWords.includes(word));
    
    if (matchingWords.length > 0) {
      return `Contains keywords: ${matchingWords.join(', ')}`;
    } else if (score > 0.3) {
      return 'High semantic similarity';
    } else {
      return 'Partial relevance';
    }
  }

  /**
   * Get all chunks for a source
   */
  public getChunks(source: string): TextChunk[] {
    return this.chunks.get(source) || [];
  }

  /**
   * Clear chunks for a source
   */
  public clearChunks(source: string): void {
    this.chunks.delete(source);
  }

  /**
   * Clear all chunks
   */
  public clearAllChunks(): void {
    this.chunks.clear();
  }

  /**
   * Get statistics about chunks
   */
  public getStats(): {
    totalSources: number;
    totalChunks: number;
    averageChunkSize: number;
  } {
    const allChunks = Array.from(this.chunks.values()).flat();
    const totalChunks = allChunks.length;
    const averageChunkSize = totalChunks > 0 ? 
      allChunks.reduce((sum, chunk) => sum + chunk.text.length, 0) / totalChunks : 0;

    return {
      totalSources: this.chunks.size,
      totalChunks,
      averageChunkSize: Math.round(averageChunkSize)
    };
  }
}

export default AdvancedRAGService;
