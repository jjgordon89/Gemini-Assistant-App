# AI Personal Chatbot - Chroma

A personal AI chatbot with a futuristic UI, capable of connecting to AI providers and interacting with Google services using OAuth 2.0.

## Features

- Gemini integration for AI responses
- Google authentication with OAuth 2.0
- LanceDB for conversation memory persistence
- Supabase for user settings storage
- Google Calendar & Tasks integration (prepared for use)
- Sleek, modern UI with glassmorphism effects

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd ai-personal-chatbot---chroma
npm install
```

### 2. Configure API Keys

Create a `.env.local` file in the project root with:

```
# Gemini API Key (required for AI functionality)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration (required for settings persistence)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Supabase Setup

1. Create a Supabase account and project at [supabase.com](https://supabase.com)
2. In your Supabase project, navigate to the SQL Editor
3. Run the SQL script in `supabase/migrations/create_user_settings.sql` to create the necessary tables and security policies

### 4. Google OAuth Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com)
2. Configure OAuth consent screen
3. Create OAuth credentials (Web application type)
4. Add your app's URL to the authorized JavaScript origins
5. Copy the Client ID and add it to the `index.html` file in the `meta` tag with name `google-signin-client_id`

### 5. Run the Application

```bash
npm run dev
```

## License

MIT