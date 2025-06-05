# Project Brief

## Overview

**Chroma AI** is a modern AI-powered conversational assistant application built with React, TypeScript, and Vite. The app primarily leverages Google's Gemini API for AI responses while supporting multiple AI providers. It enables users to interact with an intelligent AI assistant, upload and analyze documents, manage local notes, and optionally integrate with Google services such as Calendar and Tasks. The application features advanced RAG (Retrieval Augmented Generation) capabilities, real-time streaming responses, and a modern glass morphism UI design optimized for both desktop and web deployment.

## Core Features

### Currently Implemented ✅
-   **Conversational AI** with Google Gemini API and function calling capabilities
-   **RAG (Retrieval Augmented Generation)** with LanceDB vector database storage
-   **File Processing** - PDF upload, text extraction, and analysis with context awareness
-   **Local Note Management** - Create, store, search, and delete notes with vector search
-   **Google Services Integration** - OAuth2 authentication, Calendar and Tasks management
-   **AI Personas** - Customizable system prompts and personality configurations
-   **Real-time Streaming** - Live AI response streaming with tool usage indicators
-   **Tool Integration** - Weather data, calendar management, file analysis, note management
-   **Modern Responsive UI** - Glass morphism design with dark theme and accessibility features
-   **Context-Aware Responses** - Uses uploaded files and notes for enhanced AI responses
-   **Multi-format Support** - PDF text extraction and processing capabilities

### In Development 🚧
-   **Multiple AI Provider Support** - OpenAI, HuggingFace, Groq, OpenRouter integration
-   **Enhanced File Format Support** - Images, Word documents, spreadsheets
-   **Advanced RAG Capabilities** - Improved chunking, better relevance scoring
-   **Conversation Persistence** - Long-term memory across sessions
-   **Export/Import Functionality** - Backup and restore conversations and notes

### Planned Features 📋
-   **Desktop Application** - Tauri-based native app packaging
-   **Neural Network Visualization** - Cytoscape.js for AI model insights
-   **Advanced OCR** - Tesseract.js for image text extraction
-   **Local LLM Support** - Ollama integration for offline AI capabilities
-   **Enhanced Search** - Full-text search with Elasticsearch or MeiliSearch
-   **Team Collaboration** - Shared workspaces and collaborative features


## Target Users

**Primary Users:**
-   **Knowledge Workers** - Professionals who need AI assistance for document analysis, note-taking, and productivity
-   **Researchers & Students** - Users requiring document processing, information extraction, and intelligent note management
-   **Developers** - Those seeking AI-powered code assistance and technical documentation analysis
-   **Content Creators** - Writers, bloggers, and content managers needing AI support for ideation and editing

**Use Cases:**
-   Document analysis and question-answering from uploaded PDFs
-   Intelligent note-taking with vector search capabilities
-   Calendar and task management through natural language
-   Research assistance with context-aware responses
-   Personal productivity enhancement with AI personas
-   File organization and content extraction workflows


## Technical Architecture

### Current Technology Stack
**Frontend:**
-   **React 19** - Modern functional components with hooks
-   **TypeScript** - Type safety and enhanced developer experience
-   **Vite** - Fast build tooling and development server
-   **React Router DOM** - Client-side routing and navigation
-   **React Markdown** - Markdown rendering for AI responses
-   **Tailwind CSS** - Utility-first styling with custom glass morphism theme

**AI & Machine Learning:**
-   **Google Gemini API** - Primary AI provider with function calling
-   **LanceDB (vectordb)** - Client-side vector database for RAG
-   **PDF.js** - Browser-based PDF text extraction
-   **Custom Embedding Service** - Vector generation for similarity search

**Integrations:**
-   **Google Cloud APIs** - OAuth2, Calendar, Tasks integration
-   **Weather API** - Real-time weather data service
-   **ESM.sh** - Module imports without bundling

**Storage & State:**
-   **IndexedDB** - Local storage for notes and cache
-   **React Context** - Global state management
-   **Local Storage** - Settings and API key persistence

### Future Technology Roadmap
**Desktop Application:**
-   **Tauri** - Native desktop app packaging
-   **tauri-plugin-stronghold** - Secure credential storage

**Enhanced AI Capabilities:**
-   **Transformers.js** - Local embedding generation
-   **Tesseract.js** - OCR for image text extraction
-   **Ollama** - Local LLM support for offline usage

**Additional AI Providers:**
-   **OpenAI API** - GPT models integration
-   **HuggingFace API** - Open-source model access
-   **Anthropic Claude** - Alternative conversation AI

**Advanced Features:**
-   **Cytoscape.js** - Neural network visualization
-   **Elasticsearch/MeiliSearch** - Advanced full-text search
-   **Rust Backend** - High-performance server components

## Requirements & Constraints

### Technical Requirements
**Essential APIs:**
-   `GEMINI_API_KEY` - Google AI Studio API key (required for core functionality)
-   `GOOGLE_CLIENT_ID` - Google OAuth2 client ID (required for Calendar/Tasks integration)

**Optional APIs:**
-   `WEATHER_API_KEY` - Weather service integration
-   `OPENAI_API_KEY` - Future OpenAI integration
-   `HUGGINGFACE_TOKEN` - HuggingFace API access

### Performance Requirements
-   **Real-time interaction** - Sub-second response times for chat interactions
-   **Streaming responses** - Progressive AI response display for better UX
-   **Efficient vector search** - Fast similarity search across documents and notes
-   **Responsive UI** - Smooth interactions across desktop and mobile browsers
-   **Memory optimization** - Efficient handling of large documents and conversation history

### Security & Privacy Constraints
-   **Client-side processing** - All sensitive data processing remains in browser
-   **Secure credential storage** - API keys stored in environment variables only
-   **OAuth2 compliance** - Proper Google authentication flow implementation
-   **Data privacy** - No server-side storage of personal data or conversations
-   **Error handling** - Graceful degradation when APIs are unavailable

### Browser Compatibility
-   **Modern browsers** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
-   **ES Modules support** - Native ESM import/export functionality
-   **IndexedDB support** - For local data storage and caching
-   **File API support** - For document upload and processing

### Development Constraints
-   **ESM-first architecture** - No traditional bundling, direct module imports
-   **TypeScript strict mode** - Type safety and error prevention
-   **Accessibility compliance** - WCAG 2.1 AA standards for UI components
-   **Progressive enhancement** - Core features work without optional integrations
-   **Responsive design** - Mobile-first approach with desktop optimization

## Key Features Deep Dive

### RAG (Retrieval Augmented Generation)
The application implements sophisticated document analysis and question-answering capabilities:
-   **Document Upload** - PDF files are processed and chunked for optimal retrieval
-   **Vector Search** - Uses LanceDB for semantic similarity search across content
-   **Context Integration** - Relevant document chunks are provided to AI for informed responses
-   **Multi-source RAG** - Combines uploaded files and local notes for comprehensive context

### AI Personas System
Customizable AI personalities for different use cases:
-   **Pre-built Personas** - Helpful Assistant, Creative Generator, Technical Expert, etc.
-   **Custom System Prompts** - Users can define specialized AI behavior
-   **Context Awareness** - Personas adapt responses based on available data
-   **Seamless Switching** - Change AI personality mid-conversation

### Google Services Integration
Native integration with Google Workspace:
-   **OAuth2 Authentication** - Secure Google account connection
-   **Calendar Management** - Create, view, update, and delete calendar events
-   **Task Management** - Manage Google Tasks through natural language
-   **Real-time Sync** - Changes reflect immediately in Google services

### Local Note Management
Intelligent note-taking with AI-powered search:
-   **Vector-based Storage** - Notes stored with semantic embeddings
-   **Smart Search** - Find notes based on meaning, not just keywords
-   **AI Integration** - Notes serve as context for AI responses
-   **Persistent Storage** - Notes saved locally using IndexedDB

## Deployment Options

### Web Application (Current)
-   **Static Hosting** - Can be deployed to any static hosting service
-   **Vite Build** - Optimized production builds with code splitting
-   **ESM Architecture** - Reduced bundle size through dynamic imports
-   **CDN Integration** - Modules loaded from ESM.sh CDN

### Desktop Application (Planned)
-   **Tauri Framework** - Native desktop app with web technologies
-   **Cross-platform** - Windows, macOS, and Linux support
-   **Native Features** - File system access, system notifications
-   **Secure Storage** - Tauri Stronghold for credential management

## Development Workflow

### Local Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Create production build
npm run preview      # Preview production build
```

### Environment Setup
1. Create `.env.local` file with required API keys
2. Configure Google Cloud Console for OAuth2
3. Set up Google AI Studio for Gemini API access
4. Install recommended VS Code extensions for TypeScript/React

### Code Organization
-   **Components** - Reusable UI components with TypeScript interfaces
-   **Services** - Business logic separated from UI components
-   **Types** - Comprehensive TypeScript definitions
-   **Tools** - Function calling schemas for AI integration

## Performance Considerations

### Optimization Strategies
-   **Code Splitting** - Dynamic imports for large dependencies
-   **Lazy Loading** - Components loaded on demand
-   **Efficient State Management** - Minimal re-renders with proper state structure
-   **Vector Database Optimization** - Indexed storage for fast similarity search
-   **Memory Management** - Proper cleanup of large file processing operations

### Monitoring & Analytics
-   **Error Tracking** - Comprehensive error handling and logging
-   **Performance Metrics** - Load times, response times, memory usage
-   **User Experience** - Interaction patterns and feature usage
-   **API Usage Tracking** - Monitor quota consumption and costs
