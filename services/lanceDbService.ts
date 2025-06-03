
// services/lanceDbService.ts
import * as arrow from 'apache-arrow';
import { connect, Connection, Table, Query } from 'vectordb'; // Added Query for explicit typing if needed
import { RAGChunk } from '../types';

const DB_NAME = 'ChromaAIDB-RAG';
const RAG_TABLE_NAME = 'rag_chunks';

let db: Connection | null = null;

// Define an interface for the records stored in LanceDB, including the vector
interface RAGTableRecord extends RAGChunk {
  vector: number[];
}

// Define an interface for the results from a query, including _distance
interface RAGQueryResult extends RAGTableRecord {
  _distance: number;
}

let ragTable: Table<RAGTableRecord> | null = null;


const connectToDb = async (): Promise<Connection> => {
  if (db) return db;
  try {
    db = await connect(DB_NAME);
    console.log('Connected to LanceDB for RAG.');
    return db;
  } catch (error) {
    console.error('Failed to connect to LanceDB:', error);
    throw new Error('Failed to connect to LanceDB for RAG.');
  }
};

export const initRAGTable = async (): Promise<void> => {
  const ldb = await connectToDb();
  try {
    const tableNames = await ldb.tableNames();
    if (tableNames.includes(RAG_TABLE_NAME)) {
      // Use type assertion if openTable's generic inference is problematic
      ragTable = await ldb.openTable(RAG_TABLE_NAME) as Table<RAGTableRecord>;
      console.log(`Opened existing RAG table: ${RAG_TABLE_NAME}`);
    } else {
      const EMBEDDING_DIMENSION = 768; 
      const schema = new arrow.Schema([
        new arrow.Field('id', new arrow.Utf8(), false),
        new arrow.Field('sourceId', new arrow.Utf8(), true),
        new arrow.Field('sourceType', new arrow.Utf8(), true), 
        new arrow.Field('text', new arrow.Utf8(), true),
        new arrow.Field('vector', new arrow.FixedSizeList(EMBEDDING_DIMENSION, new arrow.Field('value', new arrow.Float32(), true)), true),
      ]);
      // The 'data' parameter (schema as any) is a common workaround for createTable type issues.
      ragTable = await ldb.createTable(RAG_TABLE_NAME, schema as any) as Table<RAGTableRecord>;
      console.log(`Created new RAG table: ${RAG_TABLE_NAME}`);
    }
  } catch (error) {
    console.error('Failed to initialize RAG table:', error);
    throw new Error('Failed to initialize RAG table in LanceDB.');
  }
};

export const addChunks = async (
  chunksData: Array<Omit<RAGChunk, 'id'>>, 
  vectors: number[][]
): Promise<void> => {
  if (!ragTable) {
    console.warn('RAG table not initialized. Initializing now...');
    await initRAGTable();
    if (!ragTable) {
        throw new Error('RAG table still not available after re-initialization.');
    }
  }
  if (chunksData.length !== vectors.length) {
    throw new Error('Number of chunks and vectors must match.');
  }
  if (chunksData.length === 0) {
    console.log("No chunks to add.");
    return;
  }

  const records: RAGTableRecord[] = chunksData.map((chunk, index) => ({
    id: `${chunk.sourceId}-${chunk.sourceType}-${index}-${Date.now()}`, 
    sourceId: chunk.sourceId,
    sourceType: chunk.sourceType,
    text: chunk.text,
    vector: vectors[index],
  }));

  try {
    // The `as any` cast might still be needed if the library's `add` method has overly strict types.
    // However, with `ragTable` typed as `Table<RAGTableRecord>`, `records` should fit `RAGTableRecord[]`.
    await ragTable.add(records); 
    console.log(`Added ${records.length} chunks to RAG table.`);
  } catch (error) {
    console.error('Failed to add chunks to RAG table:', error);
    throw new Error('Failed to add chunks to LanceDB.');
  }
};

export const searchRelevantChunks = async (
  queryVector: number[],
  sourceType?: 'file' | 'note',
  sourceId?: string,
  limit: number = 5
): Promise<RAGChunk[]> => {
  if (!ragTable) {
    console.warn('RAG table not initialized. Initializing now...');
    await initRAGTable();
     if (!ragTable) {
        throw new Error('RAG table still not available after re-initialization.');
    }
  }

  try {
    let query = ragTable.search(queryVector).limit(limit);
    
    let filterParts: string[] = [];
    if (sourceType) {
      filterParts.push(`sourceType = '${sourceType}'`);
    }
    if (sourceId) {
      filterParts.push(`sourceId = '${sourceId}'`);
    }
    if (filterParts.length > 0) {
      query = query.where(filterParts.join(' AND '));
    }

    // Use type assertion for the result of execute if its generic inference is problematic
    const results = await query.execute() as RAGQueryResult[];
    
    console.log(`Found ${results.length} relevant chunks from RAG search.`);
    // Map to RAGChunk, excluding vector and _distance for the return type
    return results.map(({ vector, _distance, ...chunk }) => chunk);
  } catch (error) {
    console.error('Failed to search chunks in RAG table:', error);
    return []; 
  }
};

export const clearChunksBySourceId = async (sourceId: string): Promise<void> => {
    if (!ragTable) {
        console.warn('RAG table not initialized, cannot clear chunks.');
        return;
    }
    try {
        await ragTable.delete(`sourceId = '${sourceId}'`);
        console.log(`Cleared RAG chunks for sourceId: ${sourceId}`);
    } catch (error) {
        console.error(`Failed to clear chunks for sourceId ${sourceId}:`, error);
        throw new Error(`Failed to clear chunks for sourceId ${sourceId}.`);
    }
};

export const deleteAllRAGData = async (): Promise<void> => {
    if (!db) {
        await connectToDb();
    }
    if (db) {
        try {
            const tableNames = await db.tableNames();
            if (tableNames.includes(RAG_TABLE_NAME)) {
                await db.dropTable(RAG_TABLE_NAME);
                ragTable = null; 
                console.log(`Dropped RAG table: ${RAG_TABLE_NAME}`);
            }
        } catch (error) {
            console.error('Failed to delete all RAG data:', error);
            throw new Error('Failed to delete all RAG data from LanceDB.');
        }
    }
};
