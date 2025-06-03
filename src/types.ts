

export enum ChatRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system', // For system messages, not directly displayed usually
}

// Basic Part type for content
export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded string
  };
  functionCall?: { // For when the model requests a function call
    name: string;
    args: Record<string, any>;
  };
  functionResponse?: { // For providing the result of a function call back to the model
    name: string;
    response: Record<string, any>;
  };
}


export interface Message {
  id: string;
  text: string;
  sender: ChatRole;
  timestamp: Date;
  streaming?: boolean; // For AI responses being streamed
  metadata?: Record<string, any>; // For additional info like sources
  toolCalls?: Array<{ name: string; args: Record<string, any> }>; // If a message involved the AI calling tools
  toolResponses?: Array<{ name:string; response: Record<string, any>}>; // If a message involved responses from tools
  toolCallInProgress?: string; // Name of the tool currently being executed by the AI
  sources?: Array<{ title?: string; uri: string; }>; // For web search grounding
  ragContextUsed?: boolean; // Flag to indicate if RAG context was used for this message
}

export enum AiProviderType {
  GEMINI = 'Gemini',
  OPENAI = 'OpenAI',
  GROQ = 'Groq',
  HUGGINGFACE = 'HuggingFace',
  OPENROUTER = 'OpenRouter',
}

export interface ApiProvider {
  name: AiProviderType;
  // Add other provider-specific config if needed
}

// Google User Profile
export interface GoogleUserProfile {
  name?: string;
  email?: string;
  picture?: string;
}

// Google Calendar Event
export interface CalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string; };
  end?: { dateTime?: string; date?: string; timeZone?: string; };
  location?: string;
  [key: string]: any; // Allow other properties from API
}

// Google Task List
export interface TaskList {
  id: string;
  title: string;
  [key: string]: any;
}

// Google Task
export interface Task {
  id?: string;
  title?: string;
  notes?: string;
  status?: 'needsAction' | 'completed'; // 'completed' is a boolean in API (true/false), status string is 'needsAction' or 'completed'
  due?: string; // ISO 8601 date string
  completed?: string; // ISO 8601 datetime string when completed
  [key: string]: any; // Allow other properties from API
}

// AI Persona
export interface Persona {
  name: string;
  prompt: string;
}

// Interface for uploaded file data
export interface UploadedFileData {
  name: string;
  type: string; // MIME type
  base64Data: string;
  extractedText?: string; // For text-based files like .txt, .md, or extracted from PDF
}

// Local Note
export interface Note {
  id: string;
  content: string;
  createdAt: string; // ISO string
}


// Specific types for tool arguments for better type safety
export type CreateCalendarEventArgs = {
  summary: string;
  description?: string;
  startTime: string; // ISO DateTime string
  endTime: string;   // ISO DateTime string
  location?: string;
};

export type AddTaskArgs = {
  title: string;
  notes?: string;
  dueDate?: string; // ISO Date string
  taskListId?: string;
};

export type GetWeatherArgs = {
  location: string;
};

export type SearchCalendarEventsArgs = {
  query?: string;
  timeMin?: string; // ISO DateTime string
  timeMax?: string; // ISO DateTime string
};

export type UpdateCalendarEventArgs = {
  eventId: string;
  summary?: string;
  description?: string;
  startTime?: string; // ISO DateTime string
  endTime?: string;   // ISO DateTime string
  location?: string;
};

export type DeleteCalendarEventArgs = {
  eventId: string;
};

export type SearchTasksArgs = {
  taskListId?: string;
  query?: string;
  dueBefore?: string; // ISO Date string
  dueAfter?: string;  // ISO Date string
  status?: 'needsAction' | 'completed';
};

export type UpdateTaskArgs = {
  taskId: string;
  taskListId?: string;
  title?: string;
  notes?: string;
  dueDate?: string; // ISO Date string
  status?: 'needsAction' | 'completed';
};

export type DeleteTaskArgs = {
  taskId: string;
  taskListId?: string;
};

// Argument types for Note tools
export type AddNoteArgs = {
  content: string;
};

export type ViewNotesArgs = {
  query?: string; // Optional query for client-side filtering if AI decides to use it
};

export type DeleteNoteArgs = {
  noteId: string;
};

// RAG Chunk
export interface RAGChunk {
  id: string; // unique chunk ID, can be generated (e.g. sourceId + chunkIndex)
  sourceId: string; // filename or note ID
  sourceType: 'file' | 'note';
  text: string; // the chunk content
  // vector will be handled by LanceDB, not stored directly here unless needed for other purposes
}