# Project Brief

## Overview

Gemini Assistant App is a modern AI-powered chatbot application leveraging the Gemini API, built with Node.js and React. The app enables users to interact with an AI assistant, manage conversations, and optionally integrate with Google services such as Calendar and Tasks. It features a persistent conversation memory and a modern, responsive UI for both local development and easy deployment.

## Core Features

-   Conversational AI chatbot using Gemini API
-   Google authentication and calendar/task integration (optional)
-   Persistent conversation memory
-   Modern, responsive UI
-   Local development and easy deployment
-   Integration with Google Calendar and Tasks (optional)
-   Embeddings generation and retrieval
-   OCR text extraction
-   Vector database storage
-   Conversational AI capabilities via LangChain
-   Alternative LLMs and models via Ollama
-   Additional AI functionalities via Grok AI API
-   Search functionality via Elasticsearch or MeiliSearch
-   Fuzzy string matching via Fuse.js
-   Neural network visualization via Cytoscape.js
-   Language processing via OpenAI API and ChatGPT API
-   Embedding generation and retrieval via HuggingFace API
-   Search functionality via Elasticsearch or MeiliSearch
-   State management via Redux Toolkit
-   Testing framework setup with Jest/Enzyme/Mocha Chai/Sinon
-   Code quality enforcement with Eslint + Prettier
-   Build tooling setup with Vite
-   Continuous Integration/Continuous Deployment pipeline set up on GitHub Actions


## Target Users

This application is designed for users who want to interact with an AI assistant for productivity, scheduling, and general conversation. It is suitable for individuals, professionals, and teams seeking to enhance their workflow with AI and Google service integrations.


## Technical Preferences
-   Tauri for desktop packaging
-   tauri-plugin-stronghold for secure storage
-   TypeScript for type safety and better developer experience
-   Rust for backend server
-   SvelteKit for frontend development
-   Cytoscape.js for neural network visualization
-   Transformers.js for Embedding Generation & NLP tasks
-   Tesseract.js for OCR text extraction
-   Rusqlite for database storage
-   LancDB (via Rust crate) for Vector Database
-   Prisma ORM for database interactions
-   IndexedDB for caching and offline access
-   GraphQL for API communication
-   tract-onnx for ONNX model inference
-   scraper for html parsing
-   Reqwest for making HTTP requests
-   serde/serde_json for serialization/deserialization
-   Gemini API for AI chat responses
-   Google Cloud credentials for calendar/tasks integration
-   LancDB for vector embeddings storage
-   Langchain for conversational AI capabilities and RAG     (Retrieval Augmented Generation)
-   Ollama for alternative LLMs and models
-   Grok AI API for additional AI functionalities
-   OpenAI API for language processing
-   ChatGPT API for language processing
-   HuggingFace API for embedding generation
-   Open-AI Compatible Models for compatibility with various LLMs

-   huggingface access token for embedding generation
-   JWT tokens for secure user authentication
-   Axios for HTTP requests
-   Moment.js for date/time manipulation
-   Elasticsearch for search functionality
-   MeiliSearch for full-text search
-   Fuse.js for fuzzy string matching
-   SvelteKit for frontend development
-   Redux Toolkit for state management
-   Jest/Enzyme/Mocha Chai/Sinon for testing
-   Eslint + Prettier for code quality enforcement
-   Vite for build tooling
-   GitHub Actions for CI/CD pipelines

## Requirements & Constraints

-   Requires a Gemini API key from Google AI Studio
-   Google Cloud credentials are only needed for calendar/tasks integration
-   Optimize performance for real-time interaction
-   Implement robust error handling and fallback mechanisms
-   Maintain privacy and security of user data
