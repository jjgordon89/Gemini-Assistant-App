

import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { AiProviderType, Message, ChatRole, GoogleUserProfile, Persona, Part, Note,
         CreateCalendarEventArgs, AddTaskArgs, GetWeatherArgs, SearchCalendarEventsArgs, UpdateCalendarEventArgs, DeleteCalendarEventArgs,
         SearchTasksArgs, UpdateTaskArgs, DeleteTaskArgs, AddNoteArgs, ViewNotesArgs, DeleteNoteArgs, UploadedFileData, RAGChunk
       } from './types';
import { GoogleGenAI, Chat, FunctionDeclaration, GenerateContentResponse, Tool } from "@google/genai";
import { allTools } from './toolSchemas'; 

import * as GoogleAuthService from './services/googleAuthService';
import * as GoogleCalendarService from './services/googleCalendarService';
import *  as GoogleTasksService from './services/googleTasksService';
import * as WeatherService from './services/weatherService'; 
import * as FileService from './services/fileService';
import * as NoteService from './services/noteService';
import * as LanceDbService from './services/lanceDbService';


// Use a consistent placeholder for the API key
const YOUR_GEMINI_API_KEY_PLACEHOLDER = "YOUR_GEMINI_API_KEY_HERE";
const GEMINI_API_KEY_FROM_ENV = process.env.API_KEY;
const INITIAL_GEMINI_KEY = GEMINI_API_KEY_FROM_ENV || YOUR_GEMINI_API_KEY_PLACEHOLDER;

const GOOGLE_CLIENT_ID = (document.querySelector('meta[name="google-signin-client_id"]') as HTMLMetaElement)?.content || "YOUR_GOOGLE_CLIENT_ID";

const defaultPersonas: Persona[] = [
  { name: 'Helpful Assistant', prompt: 'You are a helpful and friendly AI assistant. Be concise and informative.' },
  { name: 'Creative Idea Generator', prompt: 'You are a highly creative AI. Brainstorm innovative ideas and think outside the box. Your responses should be imaginative and inspiring.' },
  { name: 'Code Helper', prompt: 'You are an expert AI programmer. Provide code examples in markdown, explain complex programming concepts clearly, and help debug code. Be precise and technically accurate.' },
  { name: 'Formal Assistant', prompt: 'You are a professional and formal AI assistant. Maintain a respectful and business-like tone in all your communications. Avoid colloquialisms.' },
  { name: 'Sarcastic Bot', prompt: 'You are a sarcastic bot. Your responses should be witty and have a dry sense of humor, but still be helpful in your own quirky way. Don\'t be mean, just amusingly cynical.'},
  { name: 'Custom', prompt: 'You are a custom AI. Follow the instructions provided.' },
];
const DEFAULT_SYSTEM_PROMPT = defaultPersonas[0].prompt;


const App: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<AiProviderType>(AiProviderType.GEMINI);
  const [apiKeys, setApiKeys] = useState<Record<AiProviderType, string>>({
    [AiProviderType.GEMINI]: INITIAL_GEMINI_KEY,
    [AiProviderType.OPENAI]: '',
    [AiProviderType.GROQ]: '',
    [AiProviderType.HUGGINGFACE]: '',
    [AiProviderType.OPENROUTER]: '',
  });

  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUserProfile, setGoogleUserProfile] = useState<GoogleUserProfile | null>(null);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);
  const [isUsingTool, setIsUsingTool] = useState<string | null>(null);


  const [personas] = useState<Persona[]>(defaultPersonas);
  const [selectedPersonaName, setSelectedPersonaName] = useState<string>(defaultPersonas[0].name);
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>('You are a helpful AI. Behave as I instruct.');
  const [uploadedFileData, setUploadedFileData] = useState<UploadedFileData | null>(null);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);

  // RAG State
  const [aiInstance, setAiInstance] = useState<GoogleGenAI | null>(null);
  const [activeRAGFile, setActiveRAGFile] = useState<{ name: string; sourceId: string } | null>(null);


  // Initialize LanceDB for RAG and load local notes on mount
  useEffect(() => {
    LanceDbService.initRAGTable().catch(err => {
        console.error("Failed to initialize RAG table on mount:", err);
        setError("RAG system could not be initialized. File/note Q&A may not work.");
    });
    const fetchNotes = async () => {
      const notes = await NoteService.getNotes();
      setLocalNotes(notes);
      // Process existing notes for RAG if not already done (idempotency needed)
      if (aiInstance) { // Ensure aiInstance is ready for embeddings
        notes.forEach(note => processNoteForRAG(note, aiInstance));
      }
    };
    fetchNotes();
  }, [aiInstance]); // Re-run if aiInstance changes (e.g., after API key setup)

  const chunkText = (text: string, chunkSize: number = 700, overlap: number = 100): string[] => {
    const chunks: string[] = [];
    if (!text) return chunks;
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks.filter(chunk => chunk.trim() !== '');
  };

  const getEmbeddings = async (currentAiInstance: GoogleGenAI, texts: string[]): Promise<number[][]> => {
    if (!currentAiInstance) throw new Error("AI instance not available for embeddings.");
    const embeddings: number[][] = [];
    for (const text of texts) {
      try {
        const result = await currentAiInstance.models.embedContent({
          model: 'gemini-2.5-flash-preview-04-17', // Use the chat model for embeddings as per constraint
          contents: { parts: [{ text }] }, // Changed 'content' to 'contents'
        });
        // Assuming EmbedContentResponse has `embeddings: ContentEmbedding[]`
        // and ContentEmbedding has `values: number[]`
        if (result.embeddings && result.embeddings.length > 0) {
          embeddings.push(result.embeddings[0].values); // Changed to use result.embeddings[0].values
        } else {
          // Handle cases where embeddings might be unexpectedly empty, though unlikely for single valid text
          console.error("No embeddings returned for text chunk:", text);
          throw new Error('Failed to generate embedding, no embedding data returned.');
        }
      } catch (e) {
        console.error("Error generating embedding for a chunk:", e);
        // Optionally, push a zero vector or skip, but for now, throw to indicate failure
        throw new Error(`Failed to generate embedding. ${e instanceof Error ? e.message : ''}`);
      }
    }
    return embeddings;
  };
  
  const processNoteForRAG = async (note: Note, currentAiInstance: GoogleGenAI) => {
    if (!note.content || !currentAiInstance) return;
    try {
      // Simple check to avoid re-processing if we had a more robust system
      // For now, we might re-embed if app reloads and aiInstance re-initializes
      // A more robust system would check if vectors for this note ID already exist.
      console.log(`Processing note ${note.id} for RAG.`);
      const chunks = chunkText(note.content);
      if (chunks.length > 0) {
        const vectors = await getEmbeddings(currentAiInstance, chunks);
        const ragChunksData = chunks.map(text => ({
          sourceId: note.id,
          sourceType: 'note' as 'note' | 'file',
          text,
        }));
        await LanceDbService.addChunks(ragChunksData, vectors);
      }
    } catch (e) {
      console.error(`Failed to process note ${note.id} for RAG:`, e);
      // Non-critical error, don't block UI
    }
  };


  const handleGoogleTokenResponse = useCallback(async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
    setGoogleAccessToken(tokenResponse.access_token);
    setIsGoogleLoggedIn(true);
    setError(null);
    try {
      const profile = await GoogleAuthService.fetchUserProfile(tokenResponse.access_token);
      setGoogleUserProfile(profile);
    } catch (e) {
      console.error("Error fetching Google user profile or initial data:", e);
      setError("Failed to fetch Google user profile. See console for details.");
    }
  }, []);

  const handleGoogleError = useCallback((errorResponse: any) => {
    console.error("Google Sign-In Error Details:", errorResponse);
    let displayMessage = "Google Sign-In failed. Check console for specific details.";
    if (errorResponse instanceof Error && errorResponse.message) {
        displayMessage = errorResponse.message;
        if (errorResponse.message.toLowerCase().includes('popup_closed') ||
            errorResponse.message.toLowerCase().includes('popup window closed') ||
            errorResponse.message.toLowerCase().includes('client init error') ) {
            displayMessage = `Google Sign-In: ${errorResponse.message}. This often means the popup was closed or blocked. Please check: 1) 'Authorized JavaScript Origins' in your Google Cloud Console OAuth settings. 2) Browser popup blockers. 3) Ensure you are a test user if your app is in 'Testing' mode on the OAuth consent screen.`;
        }
    } else if (typeof errorResponse === 'string') {
        displayMessage = errorResponse;
    }

    setError(displayMessage);
    setIsGoogleLoggedIn(false);
    setGoogleAccessToken(null);
    setGoogleUserProfile(null);
  }, []);

  useEffect(() => {
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID") {
        GoogleAuthService.initGoogleSignIn(GOOGLE_CLIENT_ID, handleGoogleTokenResponse, handleGoogleError)
          .then(() => console.log("Google Sign-In initialized."))
          .catch(err => {
            console.error("Google Sign-In initialization failed:", err);
            if (!error) {
                 handleGoogleError(err || new Error("Google Sign-In could not be initialized. Ensure Client ID is correct and GIS library is loaded."));
            }
          });
    } else {
        const msg = "Google integration disabled: Client ID not configured in index.html or is invalid.";
        console.warn(msg);
    }
  }, [handleGoogleTokenResponse, handleGoogleError, error]);


  useEffect(() => {
    if (selectedProvider === AiProviderType.GEMINI) {
      const currentGeminiKey = apiKeys[AiProviderType.GEMINI];
      if (currentGeminiKey && currentGeminiKey !== YOUR_GEMINI_API_KEY_PLACEHOLDER) {
        try {
          const newAiInstance = new GoogleGenAI({ apiKey: currentGeminiKey });
          setAiInstance(newAiInstance); // Store the AI instance for embeddings

          let specificPersonaPrompt = DEFAULT_SYSTEM_PROMPT;
          if (selectedPersonaName === 'Custom') {
            specificPersonaPrompt = customSystemPrompt.trim() || DEFAULT_SYSTEM_PROMPT;
          } else {
            const foundPersona = personas.find(p => p.name === selectedPersonaName);
            specificPersonaPrompt = foundPersona ? foundPersona.prompt : DEFAULT_SYSTEM_PROMPT;
          }
          
          const promptParts: string[] = [specificPersonaPrompt, "You are equipped with several tools to assist the user."];

          if (isGoogleLoggedIn) {
            promptParts.push(`The user is logged into their Google Account. You have access to tools that can interact with their Google Calendar and Google Tasks, including creating, searching, updating, and deleting events and tasks. When a user's request implies such actions, use the available tools. If event or task IDs are needed for updates or deletions and not provided, use a search tool first or ask clarifying questions. For example, if asked "cancel my meeting tomorrow", first search for meetings tomorrow, then confirm with the user which one to cancel before calling the delete tool. When dealing with calendar events or tasks, if the user provides dates or times in natural language (e.g., 'tomorrow at 3pm', 'next Monday', 'in two hours'), make your best effort to convert these into the required ISO 8601 format (e.g., YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DD for due dates) for the tool arguments. If a date or time is ambiguous or crucial information is missing, ask for clarification. Always confirm event/task details before creation if derived from ambiguous phrasing.`);
          } else {
            promptParts.push('The user is not logged into Google. If topics related to Google Calendar or Tasks arise, you can inform the user that these features require Google Sign-In.');
          }
          
          promptParts.push("You also have access to Google Search for up-to-date information about current events, news, or rapidly changing topics. When you use Google Search, you MUST inform the user (e.g., 'Searching the web for...') and you MUST cite your sources by providing the URLs of the web pages you used. Your text response should incorporate information from the search, and the citations will be displayed separately.");
          
          promptParts.push("The user may upload files (like text documents or PDFs). If a file is uploaded, relevant excerpts from its content might be provided to you prefixed with 'Use the following context...'. Use this file content to answer the user's query, such as summarizing the document, answering specific questions about it, or extracting information. When such context is provided, please base your answer primarily on that information.");
          
          promptParts.push("You also have tools to manage local notes for the user: `addNote` to save a new note, `viewNotes` to see all notes (you can then summarize or list them based on user request), and `deleteNote` to remove a note by its ID. For `deleteNote`, if the user's request is vague (e.g., 'delete my last note'), use `viewNotes` first to list them with their IDs, then ask the user to confirm which note ID to delete. Content from these notes may also be provided as context for RAG.");

          promptParts.push("Always confirm destructive actions like deletion if the user's intent isn't perfectly clear or if multiple items match a vague request.");
          
          const finalSystemInstruction = promptParts.join('\n\n');
          
          const geminiTools: Tool[] = [];
          if (allTools && allTools.length > 0) {
            geminiTools.push({ functionDeclarations: allTools });
          }
          geminiTools.push({ googleSearch: {} }); 

          const chatInstance = newAiInstance.chats.create({
            model: 'gemini-2.5-flash-preview-04-17', 
            config: {
              systemInstruction: finalSystemInstruction,
              tools: geminiTools,
            },
          });
          setGeminiChat(chatInstance);
          setError(null);
        } catch (e) {
          console.error("Failed to initialize Gemini chat:", e);
          setError("Failed to initialize Gemini. Please check your API key and console for details.");
          setGeminiChat(null);
          setAiInstance(null);
        }
      } else if (!error?.startsWith("Google integration disabled")) {
          setError("Gemini API Key not configured or is a placeholder. Please set it in the sidebar.");
          setGeminiChat(null);
          setAiInstance(null);
      }
    }
  }, [selectedProvider, apiKeys, isGoogleLoggedIn, selectedPersonaName, customSystemPrompt, personas, error]);


  const handleFileChange = async (file: File | null) => {
    if (file) {
      setIsLoading(true); 
      setError(null);
      try {
        const processedData = await FileService.readFileContents(file);
        setUploadedFileData({
            name: processedData.name,
            type: processedData.type,
            base64Data: processedData.base64Data,
            extractedText: processedData.extractedText
        });

        if (processedData.extractedText && aiInstance) {
            // Clear previous file's RAG chunks if any
            if(activeRAGFile) await LanceDbService.clearChunksBySourceId(activeRAGFile.sourceId);

            const chunks = chunkText(processedData.extractedText);
            if (chunks.length > 0) {
                const vectors = await getEmbeddings(aiInstance, chunks);
                const ragChunksData = chunks.map(text => ({
                    sourceId: processedData.name, // Use filename as sourceId for file chunks
                    sourceType: 'file' as 'file' | 'note',
                    text,
                }));
                await LanceDbService.addChunks(ragChunksData, vectors);
                setActiveRAGFile({ name: processedData.name, sourceId: processedData.name });
                setMessages(prev => [...prev, {
                    id: Date.now().toString() + '-system',
                    text: `File '${processedData.name}' has been processed and is now available as context for Q&A.`,
                    sender: ChatRole.SYSTEM,
                    timestamp: new Date(),
                }]);
            }
        } else if (!processedData.extractedText) {
            setActiveRAGFile(null); // No text to process for RAG
            console.warn(`File ${processedData.name} has no extractable text for RAG processing.`)
        }

      } catch (e) {
        console.error("Error processing file for RAG:", e);
        setError(`Failed to process file ${file.name} for RAG. ${e instanceof Error ? e.message : 'Unknown error'}`);
        setUploadedFileData(null);
        setActiveRAGFile(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      setUploadedFileData(null);
      // Optionally clear activeRAGFile if user explicitly clears selection
      // For now, activeRAGFile persists until a new file is uploaded or app reloads
    }
  };


  const handleSendMessage = async (text: string) => {
    if (!text.trim() && !uploadedFileData) { 
        setError("Please type a message or upload a file.");
        return;
    }

    const userQuery = text.trim();
    const newUserMessage: Message = { 
        id: Date.now().toString(), 
        text: uploadedFileData ? `${userQuery} (File: ${uploadedFileData.name})` : userQuery, 
        sender: ChatRole.USER, 
        timestamp: new Date() 
    };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setIsLoading(true);
    setError(null);
    setIsUsingTool(null);

    let finalAiMessageId = Date.now().toString() + '-ai';
    let ragContextUsed = false;

    try {
      if (selectedProvider === AiProviderType.GEMINI) {
        if (!geminiChat || !aiInstance) {
          throw new Error("Gemini chat or AI instance is not initialized. Check API Key and Persona configuration.");
        }

        setMessages(prev => [...prev, { id: 'ai-typing', text: '', sender: ChatRole.MODEL, timestamp: new Date(), streaming: true }]);
        
        const messageParts: Part[] = [];
        let effectiveUserQuery = userQuery;

        // RAG Context Retrieval
        if (userQuery) {
            const queryEmbedding = (await getEmbeddings(aiInstance, [userQuery]))[0];
            let relevantChunksText = "";
            
            if (activeRAGFile) {
                const fileChunks = await LanceDbService.searchRelevantChunks(queryEmbedding, 'file', activeRAGFile.sourceId, 3);
                if (fileChunks.length > 0) {
                    relevantChunksText += `Context from file '${activeRAGFile.name}':\n` + fileChunks.map(c => c.text).join("\n---\n") + "\n";
                }
            }
            // Always search note chunks
            const noteChunks = await LanceDbService.searchRelevantChunks(queryEmbedding, 'note', undefined, 2);
             if (noteChunks.length > 0) {
                relevantChunksText += `Context from your notes:\n` + noteChunks.map(c => c.text).join("\n---\n") + "\n";
            }

            if (relevantChunksText) {
                effectiveUserQuery = `Use the following context to answer the user's question:\n\n---\n${relevantChunksText}\n---\nUser question: ${userQuery}`;
                ragContextUsed = true;
            }
        }
        
        if (effectiveUserQuery) { // Use modified query if RAG context was added
            messageParts.push({ text: effectiveUserQuery });
        } else if (userQuery) { // Original query if no RAG context but text exists
            messageParts.push({ text: userQuery });
        }


        if (uploadedFileData) {
            // If RAG context was from this file, we might not need to send its full content again,
            // unless the model should see the raw file for other reasons (e.g. non-text content).
            // For now, if RAG used extracted text, we prioritize that context.
            // If the user prompt is *about* the file structure itself or non-text content, we might still send it.
            // Current logic: If RAG context was added, we assume it covers the textual part of the file.
            // If no RAG or if sending raw file is still desired:
            if (!ragContextUsed || !uploadedFileData.extractedText) {
                if (uploadedFileData.extractedText && uploadedFileData.extractedText.trim()) {
                    // If no RAG context, or if RAG context was from notes, send file text
                    if (!ragContextUsed || (ragContextUsed && activeRAGFile?.sourceId !== uploadedFileData.name)) {
                         messageParts.push({ text: `Full content of uploaded file '${uploadedFileData.name}':\n\n${uploadedFileData.extractedText}` });
                    }
                } else if (!uploadedFileData.extractedText) { // For images or files where text extraction failed/not applicable
                    messageParts.push({
                        inlineData: {
                            mimeType: uploadedFileData.type,
                            data: uploadedFileData.base64Data,
                        }
                    });
                    console.warn(`Sending raw base64 data for ${uploadedFileData.name}. Model must support ${uploadedFileData.type}.`);
                }
            }
        }
        
        if (messageParts.length === 0) {
            throw new Error("No content to send (empty message and no file data/RAG context).");
        }

        let stream = await geminiChat.sendMessageStream({ message: messageParts });
        let aggregatedResponseText = "";
        let functionCalls: GenerateContentResponse['functionCalls'] = undefined;
        let groundingSources: Message['sources'] = [];

        for await (const chunk of stream) {
            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                functionCalls = chunk.functionCalls; 
                if (chunk.text) aggregatedResponseText += chunk.text;
                break; 
            }
            if (chunk.text) {
                aggregatedResponseText += chunk.text;
                setMessages(prev => prev.map(msg =>
                    msg.id === 'ai-typing' ? { ...msg, text: aggregatedResponseText } : msg
                ));
            }
            const currentGroundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (currentGroundingChunks && currentGroundingChunks.length > 0) {
                currentGroundingChunks.forEach(gc => {
                    if (gc.web) {
                        if (!groundingSources.some(s => s.uri === gc.web!.uri)) {
                             groundingSources.push({ title: gc.web!.title || gc.web!.uri, uri: gc.web!.uri });
                        }
                    }
                });
            }
        }
        finalAiMessageId = 'ai-typing'; 

        if (functionCalls && functionCalls.length > 0) {
            const functionCall = functionCalls[0]; 
            const toolName = functionCall.name;
            const toolArgs = functionCall.args as Record<string, any> || {}; 

            setIsUsingTool(toolName);
            setMessages(prev => prev.map(msg =>
                msg.id === 'ai-typing' ? { ...msg, text: aggregatedResponseText + `\n*(Using tool: ${toolName}...)*`, toolCallInProgress: toolName } : msg
            ));
            const usingToolMessageId =  Date.now().toString() + '-ai-tool-intermediate';
            setMessages(prev => prev.map(msg => msg.id === 'ai-typing' ? {...msg, id: usingToolMessageId, streaming: false } : msg));


            let toolResultPayload: any;
            let toolErrorMessage: string | null = null;

            try {
                if (!googleAccessToken && (toolName.toLowerCase().includes('calendar') || toolName.toLowerCase().includes('task'))) {
                    throw new Error("Google account not connected. Please sign in to use this feature.");
                }

                switch (toolName) {
                    case "createCalendarEvent":
                        toolResultPayload = await GoogleCalendarService.addCalendarEvent(googleAccessToken!, toolArgs as CreateCalendarEventArgs);
                        break;
                    case "addTask":
                        toolResultPayload = await GoogleTasksService.addTask(googleAccessToken!, toolArgs.taskListId || '@default', toolArgs as AddTaskArgs);
                        break;
                    case "getWeather":
                        toolResultPayload = await WeatherService.getWeather((toolArgs as GetWeatherArgs).location);
                        break;
                    case "searchCalendarEvents":
                        toolResultPayload = await GoogleCalendarService.searchCalendarEvents(googleAccessToken!, (toolArgs as SearchCalendarEventsArgs).query, (toolArgs as SearchCalendarEventsArgs).timeMin, (toolArgs as SearchCalendarEventsArgs).timeMax);
                        break;
                    case "updateCalendarEvent":
                        const { eventId: calEventId, ...calUpdates} = toolArgs as UpdateCalendarEventArgs;
                        toolResultPayload = await GoogleCalendarService.updateCalendarEvent(googleAccessToken!, calEventId, calUpdates);
                        break;
                    case "deleteCalendarEvent":
                        const eventIdForDelete = (toolArgs as DeleteCalendarEventArgs)?.eventId;
                        if (typeof eventIdForDelete === 'string') {
                            await GoogleCalendarService.deleteCalendarEvent(googleAccessToken!, eventIdForDelete);
                            toolResultPayload = { success: true, message: `Event ${eventIdForDelete} deleted.` };
                        } else {
                            toolErrorMessage = `Tool 'deleteCalendarEvent' called without a valid string 'eventId'. Args: ${JSON.stringify(toolArgs)}`;
                            console.error(toolErrorMessage);
                            toolResultPayload = { error: toolErrorMessage };
                        }
                        break;
                    case "searchTasks":
                         const taskSearchArgs = toolArgs as SearchTasksArgs;
                         toolResultPayload = await GoogleTasksService.searchTasks(googleAccessToken!, taskSearchArgs.taskListId || '@default', {
                            query: taskSearchArgs.query,
                            dueMin: taskSearchArgs.dueAfter, 
                            dueMax: taskSearchArgs.dueBefore,
                            status: taskSearchArgs.status,
                            showCompleted: taskSearchArgs.status === 'completed' || undefined 
                         });
                        break;
                    case "updateTask":
                        const { taskId, taskListId: tlId, ...taskUpdates} = toolArgs as UpdateTaskArgs;
                        toolResultPayload = await GoogleTasksService.updateTask(googleAccessToken!, tlId || '@default', taskId, taskUpdates);
                        break;
                    case "deleteTask":
                        await GoogleTasksService.deleteTask(googleAccessToken!, (toolArgs as DeleteTaskArgs).taskListId || '@default', (toolArgs as DeleteTaskArgs).taskId);
                        toolResultPayload = { success: true, message: `Task ${(toolArgs as DeleteTaskArgs).taskId} deleted.` };
                        break;
                    case "addNote":
                        const newNoteData = await NoteService.addNote((toolArgs as AddNoteArgs).content);
                        setLocalNotes(await NoteService.getNotes());
                        if (aiInstance) processNoteForRAG(newNoteData, aiInstance); // Process new note for RAG
                        toolResultPayload = { success: true, noteId: newNoteData.id, message: "Note added successfully." };
                        break;
                    case "viewNotes":
                        const notes = await NoteService.getNotes();
                        toolResultPayload = { notes };
                        break;
                    case "deleteNote":
                        const noteIdToDelete = (toolArgs as DeleteNoteArgs).noteId;
                        await NoteService.deleteNote(noteIdToDelete);
                        await LanceDbService.clearChunksBySourceId(noteIdToDelete); // Clear RAG chunks for deleted note
                        setLocalNotes(await NoteService.getNotes()); 
                        toolResultPayload = { success: true, message: `Note ${noteIdToDelete} deleted.` };
                        break;
                    default:
                        throw new Error(`Unknown tool: ${toolName}`);
                }
            } catch (e: any) {
                console.error(`Error executing tool ${toolName}:`, e);
                toolErrorMessage = e.message || "Error executing tool.";
                toolResultPayload = { error: toolErrorMessage };
            }

            const functionResponseParts: Part[] = [{
                functionResponse: {
                    name: toolName,
                    response: toolResultPayload,
                }
            }];
            
            const typingIdForToolResponse = Date.now().toString() + '-ai-typing-tool-response';
            setMessages(prev => [...prev, { id: typingIdForToolResponse, text: '', sender: ChatRole.MODEL, timestamp: new Date(), streaming: true }]);
            finalAiMessageId = typingIdForToolResponse; 

            const toolResponseStream = await geminiChat.sendMessageStream({ message: functionResponseParts });
            aggregatedResponseText = ""; 
            for await (const chunk of toolResponseStream) {
                if (chunk.text) {
                    aggregatedResponseText += chunk.text;
                    setMessages(prev => prev.map(msg =>
                        msg.id === finalAiMessageId ? { ...msg, text: aggregatedResponseText } : msg
                    ));
                }
                const currentGroundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (currentGroundingChunks && currentGroundingChunks.length > 0) {
                     currentGroundingChunks.forEach(gc => {
                        if (gc.web) {
                            if (!groundingSources.some(s => s.uri === gc.web!.uri)) {
                                groundingSources.push({ title: gc.web!.title || gc.web!.uri, uri: gc.web!.uri });
                            }
                        }
                    });
                }
            }
        }
         setMessages(prev => prev.map(msg =>
            msg.id === finalAiMessageId ? { 
                ...msg, 
                id: Date.now().toString() + '-ai-final', 
                streaming: false, 
                text: aggregatedResponseText, 
                timestamp: new Date(),
                sources: groundingSources.length > 0 ? groundingSources : undefined, 
                toolCallInProgress: undefined,
                ragContextUsed: ragContextUsed,
            } : msg
        ));

      } else { 
        await new Promise(resolve => setTimeout(resolve, 1000));
        const aiResponse: Message = {
          id: Date.now().toString() + '-ai',
          text: `Response from ${selectedProvider}: "${text}" (Provider not fully implemented yet)`,
          sender: ChatRole.MODEL,
          timestamp: new Date()
        };
        setMessages(prevMessages => [...prevMessages, aiResponse]);
      }
    } catch (e) {
      console.error("Error sending message:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to get response: ${errorMessage}`);
      setMessages(prevMessages => {
        const withoutTyping = prevMessages.filter(m => !m.id.startsWith('ai-typing') && m.id !== finalAiMessageId);
        return [...withoutTyping, {id: Date.now().toString() + '-error', text: `Error: ${errorMessage}`, sender: ChatRole.MODEL, timestamp: new Date()}];
      });
    } finally {
      setIsLoading(false);
      setIsUsingTool(null);
      if (!ragContextUsed) { // Only clear file if it wasn't primarily for RAG context in this query
         setUploadedFileData(null); 
      }
      // Do not clear activeRAGFile here, it persists for subsequent queries
      setMessages(prev => prev.filter(msg => !(msg.id === 'ai-typing' && msg.streaming)));
      setMessages(prev => prev.filter(msg => !(msg.id.endsWith('-ai-typing-tool-response') && msg.streaming)));
      setMessages(prev => prev.filter(msg => !(msg.id.endsWith('-ai-tool-intermediate') && msg.toolCallInProgress)));
    }
  };

  const handleGoogleLogin = () => {
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID") {
        GoogleAuthService.signInWithGoogle();
    } else {
        const msg = "Google Client ID not configured. Cannot sign in. Please check the application setup in index.html.";
        setError(msg);
        alert(msg);
    }
  };

  const handleGoogleLogout = async () => {
    await GoogleAuthService.signOutWithGoogle();
    setGoogleAccessToken(null);
    setGoogleUserProfile(null);
    setIsGoogleLoggedIn(false);
    setError(null);
  };

  const handleApiKeyChange = (provider: AiProviderType, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  const handleSelectPersona = (name: string) => {
    setSelectedPersonaName(name);
  };

  const handleCustomSystemPromptChange = (prompt: string) => {
    setCustomSystemPrompt(prompt);
  };

  const handleManualAddNote = async (content: string) => {
    if (!content.trim()) {
      setError("Note content cannot be empty.");
      return;
    }
    try {
      const newNote = await NoteService.addNote(content);
      setLocalNotes(await NoteService.getNotes());
      if (aiInstance) processNoteForRAG(newNote, aiInstance); // Process new note for RAG
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to add note.");
    }
  };

  const handleManualDeleteNote = async (id: string) => {
    try {
      await NoteService.deleteNote(id);
      await LanceDbService.clearChunksBySourceId(id); // Clear RAG chunks for deleted note
      setLocalNotes(await NoteService.getNotes());
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to delete note.");
    }
  };


  const isGeminiKeyPlaceholder = apiKeys[AiProviderType.GEMINI] === YOUR_GEMINI_API_KEY_PLACEHOLDER;

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden antialiased">
        <Sidebar
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          apiKeys={apiKeys}
          onApiKeyChange={handleApiKeyChange}
          isGoogleLoggedIn={isGoogleLoggedIn}
          googleUserProfile={googleUserProfile}
          onGoogleLogin={handleGoogleLogin}
          onGoogleLogout={handleGoogleLogout}
          isGoogleClientConfigured={GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID"}
          personas={personas}
          selectedPersonaName={selectedPersonaName}
          onSelectPersona={handleSelectPersona}
          customSystemPrompt={customSystemPrompt}
          onCustomSystemPromptChange={handleCustomSystemPromptChange}
          isGeminiKeyFromEnv={!!GEMINI_API_KEY_FROM_ENV && apiKeys[AiProviderType.GEMINI] === GEMINI_API_KEY_FROM_ENV}
          isGeminiKeyPlaceholder={isGeminiKeyPlaceholder}
          localNotes={localNotes}
          onManualAddNote={handleManualAddNote}
          onManualDeleteNote={handleManualDeleteNote}
        />
        <main className="flex-1 flex flex-col h-full chroma-gradient-bg relative">
          <div className="absolute top-0 left-0 right-0 h-16 bg-black/30 backdrop-blur-sm flex items-center px-6 z-10">
            <h1 className="text-2xl font-bold chroma-accent-text tracking-wider">Chroma AI</h1>
            <span className="ml-auto text-sm text-gray-400">Provider: {selectedProvider} | Persona: {selectedPersonaName} {isUsingTool ? `| Tool: ${isUsingTool}` : ''} {activeRAGFile ? `| Context: ${activeRAGFile.name}` : ''}</span>
          </div>

          <Routes>
            <Route path="/" element={
              <ChatView
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                error={error}
                currentProvider={selectedProvider}
                isGeminiKeyPlaceholder={isGeminiKeyPlaceholder}
                onFileChange={handleFileChange} 
                uploadedFileData={uploadedFileData} 
              />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
