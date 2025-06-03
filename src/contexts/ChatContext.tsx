import React, { createContext, useState, ReactNode, useCallback, Dispatch, SetStateAction } from 'react';
import { Message, ChatRole, Part, GoogleUserProfile, Persona, UploadedFileData } from '../types';
import { GoogleGenAI, Chat, FunctionDeclaration, GenerateContentResponse, Tool } from "@google/genai";

// Forward declare RAGContext types needed for handleSendMessage dependencies
// This is a common pattern when contexts depend on each other.
// Actual RAG state will come from RAGContext.
interface RagContextTypeForChat {
  aiInstance: GoogleGenAI | null;
  activeRAGFile: { name: string; sourceId: string } | null;
  uploadedFileData: UploadedFileData | null; // For non-RAG file use in messages
  clearUploadedFile: () => void; // To clear after message sent
  addMessage: (message: Message) => void; // To add system messages from RAG
  searchRelevantChunks: (queryEmbedding: number[], sourceType: 'file' | 'note', sourceId?: string, limit?: number) => Promise<any[]>; // Simplified RAGChunk
  getEmbeddings: (aiInstance: GoogleGenAI, texts: string[]) => Promise<number[][]>;
  chunkText: (text: string, chunkSize?: number, overlap?: number) => string[];
}

// Forward declare SettingsContext types
interface SettingsContextTypeForChat {
  apiKeys: { [key: string]: string };
  selectedProvider: string; // AiProviderType
  selectedPersonaName: string;
  customSystemPrompt: string;
  personas: Persona[];
}

// Forward declare AuthContext types
interface AuthContextTypeForChat {
  googleAccessToken: string | null;
  isGoogleLoggedIn: boolean;
}


interface ChatContextType {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  geminiChat: Chat | null;
  setGeminiChat: Dispatch<SetStateAction<Chat | null>>;
  isUsingTool: string | null;
  setIsUsingTool: Dispatch<SetStateAction<string | null>>;
  handleSendMessage: (
    text: string,
    ragContext: RagContextTypeForChat,
    settingsContext: SettingsContextTypeForChat,
    authContext: AuthContextTypeForChat,
    // TODO: Pass other services like NoteService, CalendarService etc., or make them available to ChatProvider
  ) => Promise<void>;
  currentSystemPrompt: string; // Store the calculated system prompt
  setCurrentSystemPrompt: Dispatch<SetStateAction<string>>;
}

import { useContext, useEffect } from 'react'; // Import useContext and useEffect
import { SettingsContext } from './SettingsContext'; // To get settings
import { AuthContext } from './AuthContext';     // To get auth state
import { RAGContext } from './RAGContext';       // To get AI instance for embeddings (if shared)

// Placeholder for YOUR_GEMINI_API_KEY_PLACEHOLDER, assuming it's globally accessible or passed if needed.
// For this refactor, we'll assume it's implicitly handled or not strictly needed inside this file directly
// if apiKeys[AiProviderType.GEMINI] correctly reflects the key or placeholder.
const YOUR_GEMINI_API_KEY_PLACEHOLDER = "YOUR_GEMINI_API_KEY_HERE"; // Define if not available elsewhere

// Moved service imports to top-level
import * as GoogleCalendarService from '../services/googleCalendarService';
import * as GoogleTasksService from '../services/googleTasksService';
import * as WeatherService from '../services/weatherService';
import * as NoteService from '../services/noteService';
import * as LanceDbService from '../services/lanceDbService'; // Added for deleteNote

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
  allTools: FunctionDeclaration[]; // For initializing Gemini chat
  // defaultSystemPrompt is now derived from SettingsContext's personas/customSystemPrompt
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children, allTools }) => {
  const settingsCtx = useContext(SettingsContext);
  const authCtx = useContext(AuthContext);
  const ragCtx = useContext(RAGContext); // Now needed for RAG operations in sendMessage

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Chat specific errors
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);
  const [isUsingTool, setIsUsingTool] = useState<string | null>(null);
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState<string>(""); // Updated by useEffect

  // Effect to initialize and update Gemini Chat and AI instance for chat
  useEffect(() => {
    if (!settingsCtx || !authCtx) return; // Ensure contexts are loaded

    const { apiKeys, selectedProvider, selectedPersonaName, customSystemPrompt, personas } = settingsCtx;
    const { isGoogleLoggedIn } = authCtx;
    // We need an AI instance for the chat. RAGContext manages its own for embeddings.
    // If they were to be shared, this logic would need careful coordination.
    let chatAiInstance: GoogleGenAI | null = null;

    if (selectedProvider === AiProviderType.GEMINI) {
      const currentGeminiKey = apiKeys[AiProviderType.GEMINI];
      if (currentGeminiKey && currentGeminiKey !== YOUR_GEMINI_API_KEY_PLACEHOLDER) {
        try {
          chatAiInstance = new GoogleGenAI({ apiKey: currentGeminiKey });

          let specificPersonaPrompt = personas.length > 0 ? personas[0].prompt : "You are a helpful AI.";
          if (selectedPersonaName === 'Custom') {
            specificPersonaPrompt = customSystemPrompt.trim() || specificPersonaPrompt;
          } else {
            const foundPersona = personas.find(p => p.name === selectedPersonaName);
            specificPersonaPrompt = foundPersona ? foundPersona.prompt : specificPersonaPrompt;
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
          setCurrentSystemPrompt(finalSystemInstruction);

          const geminiToolsConfig: Tool[] = [];
          if (allTools && allTools.length > 0) {
            geminiToolsConfig.push({ functionDeclarations: allTools });
          }
          geminiToolsConfig.push({ googleSearch: {} });

          const chatSession = chatAiInstance.chats.create({
            model: 'gemini-2.5-flash-preview-04-17', // TODO: Make model configurable
            config: {
              systemInstruction: finalSystemInstruction,
              tools: geminiToolsConfig,
            },
          });
          setGeminiChat(chatSession);
          setError(null);
        } catch (e) {
          console.error("ChatContext: Failed to initialize Gemini chat:", e);
          const errorMsg = e instanceof Error ? e.message : String(e);
          setError(`Failed to initialize Gemini Chat: ${errorMsg}. Please check your API key and persona settings.`);
          setGeminiChat(null);
        }
      } else if (!authCtx.error?.includes("Google integration disabled") && selectedProvider === AiProviderType.GEMINI) {
          setError("Gemini API Key is not configured or is invalid. Please set it in the sidebar to use Gemini.");
          setGeminiChat(null);
      }
    } else {
      // Handle other providers if necessary, or clear Gemini chat state
      setGeminiChat(null); // Clear chat if provider changes
      if (settingsCtx?.personas?.length > 0 && settingsCtx.selectedProvider !== AiProviderType.GEMINI) { // Check settingsCtx before accessing
         setCurrentSystemPrompt(settingsCtx.personas[0].prompt); // Reset to a generic default
      } else if (settingsCtx?.personas?.length > 0) {
        // If settingsCtx.personas exists but selectedProvider is Gemini (and key is missing),
        // it might have already been handled by the Gemini specific path.
        // This ensures a sensible default if somehow missed.
        setCurrentSystemPrompt(settingsCtx.personas[0].prompt);
      } else {
        setCurrentSystemPrompt("You are a helpful AI."); // Fallback if no personas
      }
    }
  }, [settingsCtx, authCtx, allTools, setCurrentSystemPrompt, setGeminiChat, setError]);

  // Service imports were moved to the top of the file.

  const handleSendMessage = useCallback(async (
    text: string,
    // ragContext, settingsContextForChat, authContextForChat are no longer explicit params
    // as ChatProvider can now access these contexts directly (SettingsContext, AuthContext, RAGContext)
  ) => {
    if (!settingsCtx || !authCtx || !ragCtx) {
      setError("Required contexts are not available for sending message.");
      return;
    }
    const { selectedProvider } = settingsCtx; // From SettingsContext
    const { googleAccessToken } = authCtx; // From AuthContext
    const {
      aiInstance: ragAiInstance, // This is the AI instance from RAGContext, used for embeddings
      activeRAGFile,
      uploadedFileData,
      clearUploadedFile,
      searchRelevantChunks,
      getEmbeddingsFromRAG, // Renamed function from RAGContext
      chunkText,
      processNoteForRAG, // For adding new notes from tool call
    } = ragCtx;


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
        if (!geminiChat || !ragAiInstance) { // Check for RAG AI instance too for embeddings
          throw new Error("Gemini chat or RAG AI instance is not initialized. Check API Key and Persona configuration.");
        }

        setMessages(prev => [...prev, { id: 'ai-typing', text: '', sender: ChatRole.MODEL, timestamp: new Date(), streaming: true }]);

        const messageParts: Part[] = [];
        let effectiveUserQuery = userQuery;

        if (userQuery && ragAiInstance) { // Ensure RAG AI instance is available for embeddings
            const queryEmbedding = (await getEmbeddingsFromRAG([userQuery]))[0]; // Use RAG context's getEmbeddings
            let relevantChunksText = "";

            if (activeRAGFile) {
                const fileChunks = await searchRelevantChunks(queryEmbedding, 'file', activeRAGFile.sourceId, 3);
                if (fileChunks.length > 0) {
                    relevantChunksText += `Context from file '${activeRAGFile.name}':\n` + fileChunks.map((c: any) => c.text).join("\n---\n") + "\n";
                }
            }
            const noteChunks = await searchRelevantChunks(queryEmbedding, 'note', undefined, 2);
             if (noteChunks.length > 0) {
                relevantChunksText += `Context from your notes:\n` + noteChunks.map((c: any) => c.text).join("\n---\n") + "\n";
            }

            if (relevantChunksText) {
                effectiveUserQuery = `Use the following context to answer the user's question:\n\n---\n${relevantChunksText}\n---\nUser question: ${userQuery}`;
                ragContextUsed = true;
            }
        }

        if (effectiveUserQuery) {
            messageParts.push({ text: effectiveUserQuery });
        } else if (userQuery) {
            messageParts.push({ text: userQuery });
        }

        if (uploadedFileData) {
            if (!ragContextUsed || !uploadedFileData.extractedText) {
                if (uploadedFileData.extractedText && uploadedFileData.extractedText.trim()) {
                    if (!ragContextUsed || (ragContextUsed && activeRAGFile?.sourceId !== uploadedFileData.name)) {
                         messageParts.push({ text: `Full content of uploaded file '${uploadedFileData.name}':\n\n${uploadedFileData.extractedText}` });
                    }
                } else if (!uploadedFileData.extractedText) {
                    messageParts.push({
                        inlineData: {
                            mimeType: uploadedFileData.type,
                            data: uploadedFileData.base64Data,
                        }
                    });
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
                        if (typeof eventIdForDelete === 'string' && eventIdForDelete.trim() !== '') {
                            await GoogleCalendarService.deleteCalendarEvent(googleAccessToken!, eventIdForDelete);
                            toolResultPayload = { success: true, message: `Calendar event '${eventIdForDelete}' deleted successfully.` };
                        } else {
                            toolErrorMessage = `Could not delete calendar event: Event ID was missing or invalid. Args: ${JSON.stringify(toolArgs)}`;
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
                        const { taskId, taskListId: tlIdToUpdate, ...taskUpdates} = toolArgs as UpdateTaskArgs;
                        if (!taskId || taskId.trim() === '') {
                            toolErrorMessage = `Could not update task: Task ID was missing. Args: ${JSON.stringify(toolArgs)}`;
                            toolResultPayload = { error: toolErrorMessage };
                        } else {
                            toolResultPayload = await GoogleTasksService.updateTask(googleAccessToken!, tlIdToUpdate || '@default', taskId, taskUpdates);
                        }
                        break;
                    case "deleteTask":
                        const {taskId: idToDelete, taskListId: tlIdFromDelete } = toolArgs as DeleteTaskArgs;
                        if (!idToDelete || idToDelete.trim() === '') {
                            toolErrorMessage = `Could not delete task: Task ID was missing. Args: ${JSON.stringify(toolArgs)}`;
                            toolResultPayload = { error: toolErrorMessage };
                        } else {
                            await GoogleTasksService.deleteTask(googleAccessToken!, tlIdFromDelete || '@default', idToDelete);
                            toolResultPayload = { success: true, message: `Task '${idToDelete}' deleted successfully.` };
                        }
                        break;
                    case "addNote":
                        const addNoteContent = (toolArgs as AddNoteArgs).content;
                        if (!addNoteContent || addNoteContent.trim() === '') {
                            toolErrorMessage = "Could not add note: Content was empty.";
                            toolResultPayload = { error: toolErrorMessage };
                        } else {
                            const newNoteData = await NoteService.addNote(addNoteContent);
                            if (ragAiInstance) await processNoteForRAG(newNoteData, ragAiInstance);
                            toolResultPayload = { success: true, noteId: newNoteData.id, message: "Note added successfully." };
                        }
                        break;
                    case "viewNotes":
                        toolResultPayload = { notes: await NoteService.getNotes() };
                        break;
                    case "deleteNote":
                        const noteIdToDelete = (toolArgs as DeleteNoteArgs).noteId;
                        if (!noteIdToDelete || noteIdToDelete.trim() === '') {
                            toolErrorMessage = `Could not delete note: Note ID was missing. Args: ${JSON.stringify(toolArgs)}`;
                            toolResultPayload = { error: toolErrorMessage };
                        } else {
                            await NoteService.deleteNote(noteIdToDelete);
                            await LanceDbService.clearChunksBySourceId(noteIdToDelete);
                            toolResultPayload = { success: true, message: `Note '${noteIdToDelete}' deleted successfully.` };
                        }
                        break;
                    default:
                        toolErrorMessage = `Error: Unknown tool '${toolName}' was called by the AI.`;
                        console.error(toolErrorMessage);
                        toolResultPayload = { error: toolErrorMessage };
                        // Do not throw here, let the AI get the error message for the unknown tool
                }
            } catch (e: any) {
                console.error(`Error executing tool ${toolName}:`, e);
                toolErrorMessage = e.message || `An unexpected error occurred while executing tool: ${toolName}.`;
                toolResultPayload = { error: toolErrorMessage };
            }

            // If a tool-specific error message was generated, make sure it's in the payload.
            if (toolErrorMessage && !toolResultPayload.error) {
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

      } else { // Non-Gemini provider (placeholder)
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
      if (!ragContextUsed && uploadedFileData) {
         clearUploadedFile();
      }
      setMessages(prev => prev.filter(msg => !(msg.id === 'ai-typing' && msg.streaming)));
      setMessages(prev => prev.filter(msg => !(msg.id.endsWith('-ai-typing-tool-response') && msg.streaming)));
      setMessages(prev => prev.filter(msg => !(msg.id.endsWith('-ai-tool-intermediate') && msg.toolCallInProgress)));
    }
  }, [geminiChat, settingsCtx, authCtx, ragCtx, setMessages, setIsLoading, setError, setIsUsingTool, allTools]);


  if (!settingsCtx || !authCtx || !ragCtx) {
    return <div>Loading settings or auth provider...</div>;
  }

  return (
    <ChatContext.Provider value={{
      messages,
      setMessages,
      isLoading,
      setIsLoading,
      error,
      setError,
      geminiChat,
      setGeminiChat,
      isUsingTool,
      setIsUsingTool,
      handleSendMessage,
      currentSystemPrompt,
      setCurrentSystemPrompt,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
