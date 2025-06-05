# Project Configuration

## Tech Stack

### Currently Implemented
-   **React 19** for frontend development  
-   **TypeScript** for type safety and better developer experience
-   **Vite** for build tooling and development server
-   **Google Gemini API** for AI chat responses (primary provider)
-   **LanceDB** (via vectordb) for vector embeddings storage
-   **PDF.js** for PDF text extraction and processing
-   **React Router DOM** for client-side routing
-   **React Markdown** for markdown rendering in chat
-   **Google Cloud APIs** for calendar/tasks integration
-   **ESM.sh** for module imports (no bundler needed)
-   **IndexedDB** for local storage and caching

### Planned/Future Implementation
-   **Tauri** for desktop packaging
-   **tauri-plugin-stronghold** for secure storage
-   **Rust backend server** for enhanced performance
-   **Cytoscape.js** for neural network visualization
-   **Transformers.js** for local embedding generation
-   **Tesseract.js** for OCR text extraction
-   **OpenAI API** for additional language processing
-   **HuggingFace API** for embedding generation
-   **Ollama** for alternative LLMs and local models

## Project Structure

```
/
├── App.tsx                    # Main React application entry point
├── index.tsx                  # React DOM render entry
├── index.html                 # HTML template with ESM imports
├── types.ts                   # TypeScript type definitions
├── toolSchemas.ts             # Gemini function calling schemas
├── vite.config.ts             # Vite configuration
├── package.json               # Dependencies and scripts
├── metadata.json              # App metadata
├── google.d.ts                # Google APIs type definitions
├── README.md                  # Project documentation
├── components/                # React UI components
│   ├── ChatView.tsx           # Main chat interface
│   ├── ChatInput.tsx          # Message input component
│   ├── MessageBubble.tsx      # Individual message display
│   ├── Sidebar.tsx            # Settings and configuration panel
│   └── icons/                 # Icon components
│       └── ChromaIcons.tsx    # Custom icon library
├── services/                  # Business logic and API services
│   ├── fileService.ts         # File processing (PDF, text)
│   ├── googleAuthService.ts   # Google OAuth implementation
│   ├── googleCalendarService.ts # Google Calendar integration
│   ├── googleTasksService.ts  # Google Tasks integration
│   ├── lanceDbService.ts      # Vector database operations
│   ├── noteService.ts         # Local note management
│   └── weatherService.ts      # Weather API integration
├── supabase/                  # Database configuration
│   └── migrations/            # SQL migration files
├── cline_docs/                # Project documentation
│   ├── projectBrief.md        # Project overview and requirements
│   └── .clinerules            # Development guidelines and config
└── ai-personal-chatbot---chroma/ # Legacy/alternative implementation
    ├── App.tsx                # Alternative app structure
    ├── components/            # Alternative UI components
    ├── contexts/              # React context providers
    ├── hooks/                 # Custom React hooks
    └── services/              # Alternative service implementations
```

## Core Features Implemented

-   **Conversational AI** using Google Gemini API with function calling
-   **Multi-provider support** (Gemini primary, others in development)
-   **RAG (Retrieval Augmented Generation)** with LanceDB vector storage
-   **File processing** for PDF and text documents with OCR capabilities
-   **Google services integration** (Calendar, Tasks) with OAuth2
-   **Local note management** with vector search capabilities
-   **Persistent conversation memory** 
-   **AI Personas** with customizable system prompts
-   **Real-time streaming** responses from AI
-   **Tool integration** (weather, file analysis, calendar management)
-   **Modern responsive UI** with glass morphism design
-   **Context-aware responses** using uploaded files and notes

## Current Implementation Status

### ✅ Fully Implemented
-   Google Gemini AI integration with function calling
-   PDF file upload and text extraction
-   Vector database storage and RAG retrieval
-   Google OAuth2 authentication
-   Google Calendar and Tasks integration
-   Local note management with vector search
-   AI persona system with custom prompts
-   Modern chat interface with streaming responses
-   Tool integration (weather, calendar, file analysis)
-   Context-aware responses using uploaded files

### 🚧 In Development
-   Multiple AI provider support (OpenAI, HuggingFace, etc.)
-   Enhanced file format support (images, documents)
-   Advanced RAG capabilities
-   Conversation persistence and memory
-   Export/import functionality

### 📋 Planned Features
-   Tauri desktop application wrapper
-   Rust backend for enhanced performance
-   Neural network visualization
-   Advanced OCR with Tesseract.js
-   Local LLM support via Ollama
-   Enhanced search capabilities

## Database Migrations

SQL files in `/supabase/migrations` should:

-   Use sequential numbering with timestamps: `20250603043441_description.sql`
-   Include descriptive names for the migration purpose
-   Be reviewed by Cline before execution
-   Focus on core data persistence (currently minimal usage)

## Development Workflow

-   **Primary development** on main branch using Vite dev server
-   **Local development** via `npm run dev` (port 5173)
-   **Production builds** via `npm run build` 
-   **ESM-first architecture** with dynamic imports from ESM.sh
-   **No bundler dependencies** - all modules loaded via browser ESM
-   **Environment variables** loaded via Vite's env system
-   **Google API credentials** configured via environment or manual input
-   **Cline assists** with code review and implementation
-   **Hot reload** enabled for rapid development iteration

## API Keys and Configuration

Required for full functionality:
-   `GEMINI_API_KEY` - Google AI Studio API key (primary AI provider)
-   `GOOGLE_CLIENT_ID` - For Google OAuth2 (Calendar/Tasks integration)

Optional for extended features:
-   `OPENAI_API_KEY` - OpenAI integration (planned)
-   `HUGGINGFACE_TOKEN` - HuggingFace API access (planned)
-   `WEATHER_API_KEY` - Weather service integration

## Security Guidelines

**DO NOT read, modify, or expose:**
-   `.env` files or `.env.local` 
-   `process.env` values in client-side code
-   Any files containing API keys or credentials
-   Google OAuth2 tokens or refresh tokens
-   Personal user data from Google services

**Best Practices:**
-   Use environment variables for sensitive configuration
-   Implement proper error handling for API failures
-   Validate user inputs before processing
-   Use TypeScript for type safety and error prevention
-   Keep API keys in environment variables, not hardcoded
-   Implement proper OAuth2 flow for Google services

## Development Guidelines

### Code Style
-   Use TypeScript for all new files
-   Follow React functional component patterns
-   Use React hooks for state management
-   Implement proper error boundaries and handling
-   Use async/await for asynchronous operations
-   Follow naming conventions (camelCase for variables, PascalCase for components)

### Component Structure
-   Keep components small and focused on single responsibility
-   Use proper TypeScript interfaces for props
-   Implement accessibility attributes (aria-labels, etc.)
-   Use semantic HTML elements
-   Follow React best practices for performance

### Service Layer
-   Separate business logic into service files
-   Use proper error handling and user-friendly error messages
-   Implement retry logic for network requests
-   Use TypeScript for type safety in API interactions
-   Document complex functions with JSDoc comments

## Troubleshooting Common Issues

### API Key Issues
-   Ensure `GEMINI_API_KEY` is set in `.env.local`
-   Check if API key has proper permissions in Google AI Studio
-   Verify API quotas and usage limits

### Google Integration Issues
-   Confirm `GOOGLE_CLIENT_ID` is configured correctly
-   Check OAuth2 redirect URIs in Google Cloud Console
-   Verify required scopes for Calendar and Tasks APIs

### Build Issues
-   Clear Vite cache: `rm -rf node_modules/.vite`
-   Check for TypeScript errors: `npx tsc --noEmit`
-   Verify all imports use correct paths and exist

## Architecture Notes

-   **Client-side only** - No backend server currently implemented
-   **ESM modules** loaded directly from CDN (esm.sh)
-   **Vector storage** handled client-side via LanceDB/vectordb
-   **File processing** done in browser (PDF.js, etc.)
-   **State management** via React hooks and context (no Redux yet)
-   **Routing** handled by React Router DOM
-   **Styling** via Tailwind CSS classes and custom gradients