export enum ChatRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system', // For system messages, not directly displayed usually
}

export interface Message {
  id: string;
  text: string;
  sender: ChatRole;
  timestamp: Date;
  streaming?: boolean; // For AI responses being streamed
  metadata?: Record<string, any>; // For additional info like sources
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