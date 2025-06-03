import React, { createContext, useState, ReactNode, useCallback, Dispatch, SetStateAction, useEffect } from 'react';
import { UploadedFileData, Note, Part } from '../types';
import { GoogleGenAI } from "@google/genai";
import * as FileService from '../services/fileService';
import * as NoteService from '../services/noteService';
import * as LanceDbService from '../services/lanceDbService';

// Interface for what ChatContext might need from RAGContext
// This helps keep direct dependencies clean if ChatContext consumes RAGContext.
export interface RAGContextForChat {
  aiInstance: GoogleGenAI | null;
  activeRAGFile: { name: string; sourceId: string } | null;
  uploadedFileData: UploadedFileData | null;
  clearUploadedFile: () => void;
  addMessageToChat: (message: Pick<Part, 'text'> & { role: 'system' | 'user' | 'model' | 'error' }) => void; // Simplified message for system notifications
  searchRelevantChunks: typeof LanceDbService.searchRelevantChunks;
  getEmbeddingsFromRAG: (texts: string[]) => Promise<number[][]>; // Renamed to avoid clash if also in ChatContext
  chunkText: (text: string, chunkSize?: number, overlap?: number) => string[];
}


interface RAGContextType {
  uploadedFileData: UploadedFileData | null;
  setUploadedFileData: Dispatch<SetStateAction<UploadedFileData | null>>;
  localNotes: Note[];
  setLocalNotes: Dispatch<SetStateAction<Note[]>>;
  aiInstance: GoogleGenAI | null;
  setAiInstance: Dispatch<SetStateAction<GoogleGenAI | null>>;
  activeRAGFile: { name: string; sourceId: string } | null;
  setActiveRAGFile: Dispatch<SetStateAction<{ name: string; sourceId: string } | null>>;
  isProcessingFile: boolean; // New loading state for file operations
  isProcessingNote: boolean; // New loading state for note operations
  ragError: string | null; // Expose RAG-specific errors

  handleFileChange: (file: File | null, addMessageToChat: RAGContextForChat['addMessageToChat']) => Promise<void>;
  processNoteForRAG: (note: Note, currentAiInstance?: GoogleGenAI) => Promise<void>;
  chunkText: (text: string, chunkSize?: number, overlap?: number) => string[];
  getEmbeddings: (texts: string[], currentAiInstance?: GoogleGenAI) => Promise<number[][]>;

  handleManualAddNote: (content: string, addMessageToChat: RAGContextForChat['addMessageToChat']) => Promise<void>;
  handleManualDeleteNote: (id: string, addMessageToChat: RAGContextForChat['addMessageToChat']) => Promise<void>;
  clearUploadedFile: () => void; // Method to clear uploadedFileData
  searchRelevantChunks: typeof LanceDbService.searchRelevantChunks; // Expose directly
}

export const RAGContext = createContext<RAGContextType | undefined>(undefined);

interface RAGProviderProps {
  children: ReactNode;
  // Gemini API Key from SettingsContext will be used to initialize aiInstance here
  geminiApiKey?: string;
}

export const RAGProvider: React.FC<RAGProviderProps> = ({ children, geminiApiKey }) => {
  const [uploadedFileData, setUploadedFileData] = useState<UploadedFileData | null>(null);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [aiInstance, setAiInstance] = useState<GoogleGenAI | null>(null);
  const [activeRAGFile, setActiveRAGFile] = useState<{ name: string; sourceId: string } | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isProcessingNote, setIsProcessingNote] = useState(false);


  useEffect(() => {
    if (geminiApiKey && geminiApiKey !== "YOUR_GEMINI_API_KEY_HERE") {
      try {
        const newAiInstance = new GoogleGenAI({ apiKey: geminiApiKey });
        setAiInstance(newAiInstance);
        console.log("RAGContext: AI Instance for embeddings created.");
        setRagError(null); // Clear previous key errors
      } catch (e) {
        console.error("RAGContext: Failed to initialize GoogleGenAI for RAG embeddings:", e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        setAiInstance(null);
        setRagError(`RAG AI Initialization Error: ${errorMsg}. Embeddings and file/note processing may fail. Please check your Gemini API key.`);
      }
    } else {
      setAiInstance(null);
      setRagError("RAGContext: Gemini API Key not configured. Embeddings and file/note processing will not work.");
    }
  }, [geminiApiKey]);


  useEffect(() => {
    LanceDbService.initRAGTable().catch(err => {
        console.error("RAGContext: Failed to initialize RAG table on mount:", err);
        setRagError("RAG system could not be initialized. File/note Q&A may not work.");
    });
    const fetchNotes = async () => {
      const notes = await NoteService.getNotes();
      setLocalNotes(notes);
      // Initial processing of notes for RAG if aiInstance is ready
      if (aiInstance && notes.length > 0) {
        console.log("RAGContext: Processing existing notes on init.");
        notes.forEach(note => processNoteForRAG(note, aiInstance));
      }
    };
    fetchNotes();
  }, [aiInstance]); // Re-process notes if aiInstance changes (e.g. key update)


  const chunkText = useCallback((text: string, chunkSize: number = 700, overlap: number = 100): string[] => {
    const chunks: string[] = [];
    if (!text) return chunks;
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks.filter(chunk => chunk.trim() !== '');
  }, []);

  const getEmbeddings = useCallback(async (texts: string[], currentAiInstance?: GoogleGenAI): Promise<number[][]> => {
    const instanceToUse = currentAiInstance || aiInstance;
    if (!instanceToUse) throw new Error("RAGContext: AI instance not available for embeddings.");
    const embeddings: number[][] = [];
    for (const text of texts) {
      try {
        // TODO: model name should be configurable or from a constant
        const result = await instanceToUse.models.embedContent({
          model: 'gemini-2.5-flash-preview-04-17',
          contents: { parts: [{ text }] },
        });
        if (result.embeddings && result.embeddings.length > 0) {
          embeddings.push(result.embeddings[0].values);
        } else {
          throw new Error('Failed to generate embedding, no embedding data returned.');
        }
      } catch (e) {
        console.error("RAGContext: Error generating embedding for a chunk:", e);
        throw new Error(`RAGContext: Failed to generate embedding. ${e instanceof Error ? e.message : ''}`);
      }
    }
    return embeddings;
  }, [aiInstance]);

  const processNoteForRAG = useCallback(async (note: Note, currentAiInstance?: GoogleGenAI) => {
    const instanceToUse = currentAiInstance || aiInstance;
    if (!note.content || !instanceToUse) return;
    try {
      console.log(`RAGContext: Processing note ${note.id} for RAG.`);
      const chunks = chunkText(note.content);
      if (chunks.length > 0) {
        const vectors = await getEmbeddings(chunks, instanceToUse);
        const ragChunksData = chunks.map(chunkText => ({
          sourceId: note.id,
          sourceType: 'note' as 'note' | 'file',
          text: chunkText, // ensure this is 'text' not 'chunkText' if service expects 'text'
        }));
        await LanceDbService.addChunks(ragChunksData, vectors);
      }
    } catch (e) {
      console.error(`RAGContext: Failed to process note ${note.id} for RAG:`, e);
      setRagError(`RAGContext: Failed to process note ${note.id}. ${e instanceof Error ? e.message : ''}`);
    }
  }, [aiInstance, chunkText, getEmbeddings]);

  const handleFileChange = useCallback(async (file: File | null, addMessageToChat: RAGContextForChat['addMessageToChat']) => {
    if (file) {
      // Consider using setIsLoading from ChatContext if this becomes slow
      setRagError(null);
      setIsProcessingFile(true);
      setRagError(null);
      try {
        const processedData = await FileService.readFileContents(file);
        setUploadedFileData(processedData);

        if (processedData.extractedText && aiInstance) {
            if(activeRAGFile) {
              await LanceDbService.clearChunksBySourceId(activeRAGFile.sourceId);
              console.log(`RAGContext: Cleared old chunks for source ID ${activeRAGFile.sourceId}`);
            }

            const chunks = chunkText(processedData.extractedText);
            if (chunks.length > 0) {
                const vectors = await getEmbeddings(chunks, aiInstance);
                const ragChunksData = chunks.map(text => ({
                    sourceId: processedData.name,
                    sourceType: 'file' as 'file' | 'note',
                    text,
                }));
                await LanceDbService.addChunks(ragChunksData, vectors);
                setActiveRAGFile({ name: processedData.name, sourceId: processedData.name });
                addMessageToChat({ text: `File '${processedData.name}' processed and ready for RAG context.`, role: 'system' });
            } else {
                addMessageToChat({ text: `File '${processedData.name}' processed, but no text content found to index for RAG.`, role: 'system' });
            }
        } else if (!processedData.extractedText && aiInstance) {
            setActiveRAGFile(null);
            addMessageToChat({ text: `File '${processedData.name}' has no extractable text content for RAG. You can still ask general questions about it if the AI supports its format (e.g. images).`, role: 'system' });
        } else if (!aiInstance) {
            throw new Error("AI instance for embeddings is not available. Check API Key.");
        }
      } catch (e) {
        console.error("RAGContext: Error processing file for RAG:", e);
        const errorMsg = `Failed to process file '${file.name}': ${e instanceof Error ? e.message : 'Unknown error'}.`;
        setRagError(errorMsg); // Set context error
        addMessageToChat({ text: errorMsg, role: 'error' }); // Also send to chat
        setUploadedFileData(null);
        setActiveRAGFile(null);
      } finally {
        setIsProcessingFile(false);
      }
    } else {
      setUploadedFileData(null);
      // No need to clear activeRAGFile if no new file is selected, user might want to continue querying previous file.
    }
  }, [aiInstance, chunkText, getEmbeddings, activeRAGFile]);

  const handleManualAddNote = async (content: string, addMessageToChat: RAGContextForChat['addMessageToChat']) => {
    if (!content.trim()) {
      addMessageToChat({ text: "Error: Note content cannot be empty.", role: 'error' });
      return;
    }
    setIsProcessingNote(true);
    setRagError(null);
    try {
      const newNote = await NoteService.addNote(content);
      // Update local notes, ensuring newest is first if that's the desired sort order
      setLocalNotes(prevNotes => [newNote, ...prevNotes]);
      if (aiInstance) {
        await processNoteForRAG(newNote, aiInstance);
        addMessageToChat({ text: `Note "${newNote.id}" added and processed for RAG.`, role: 'system' });
      } else {
        addMessageToChat({ text: `Note "${newNote.id}" added, but RAG processing skipped (AI instance not ready).`, role: 'system' });
      }
    } catch (e: any) {
      const errorMsg = `Failed to add note: ${e.message || 'Unknown error'}.`;
      addMessageToChat({ text: errorMsg, role: 'error' });
      setRagError(errorMsg);
    } finally {
      setIsProcessingNote(false);
    }
  };

  const handleManualDeleteNote = async (id: string, addMessageToChat: RAGContextForChat['addMessageToChat']) => {
    setIsProcessingNote(true);
    setRagError(null);
    try {
      await NoteService.deleteNote(id);
      await LanceDbService.clearChunksBySourceId(id);
      setLocalNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      addMessageToChat({ text: `Note "${id}" deleted successfully.`, role: 'system' });
    } catch (e: any) {
      const errorMsg = `Failed to delete note "${id}": ${e.message || 'Unknown error'}.`;
      addMessageToChat({ text: errorMsg, role: 'error' });
      setRagError(errorMsg);
    } finally {
      setIsProcessingNote(false);
    }
  };

  const clearUploadedFile = useCallback(() => {
    setUploadedFileData(null);
  }, []);


  return (
    <RAGContext.Provider value={{
      uploadedFileData,
      setUploadedFileData,
      localNotes,
      setLocalNotes,
      aiInstance,
      setAiInstance,
      activeRAGFile,
      setActiveRAGFile,
      handleFileChange,
      processNoteForRAG,
      chunkText,
      getEmbeddings,
      handleManualAddNote,
      handleManualDeleteNote,
      clearUploadedFile,
      searchRelevantChunks: LanceDbService.searchRelevantChunks, // Expose directly
      // ragError can be exposed if needed by UI, or handled via addMessageToChat({role: 'error'})
    }}>
      {children}
    </RAGContext.Provider>
  );
};
