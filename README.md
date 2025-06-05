Here is a detailed README.md for your Gemini Assistant App, including setup, usage, environment variables, project structure, and deployment instructions.

---

# Gemini Assistant App

A modern AI-powered chatbot application leveraging Gemini API, built with Node.js and React. This app enables users to interact with an AI assistant, manage conversations, and integrate with Google services.

---

## Features

- Conversational AI chatbot using Gemini API
- Google authentication and calendar/task integration
- Persistent conversation memory
- Modern, responsive UI
- Local development and easy deployment

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- A Gemini API key (get from Google AI Studio)
- (Optional) Google Cloud credentials for calendar/tasks integration

---

## Getting Started

### 1. Clone the Repository

```sh
git clone https://github.com/yourusername/gemini-assistant-app.git
cd gemini-assistant-app
```

### 2. Install Dependencies

```sh
npm install
```

### 3. Configure Environment Variables

Create a .env.local file in the project root and add your Gemini API key:

```
GEMINI_API_KEY=your-gemini-api-key
```

If you use Google integrations, add:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Run the App Locally

```sh
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal).

---

## Project Structure

```
Gemini-Assistant-App/
│
├── App.tsx                # Main React app entry
├── index.tsx              # React DOM render
├── components/            # UI components (ChatInput, ChatView, Sidebar, etc.)
├── contexts/              # React context providers (AI, Auth, Chat, Settings)
├── hooks/                 # Custom React hooks
├── services/              # API and utility services (Google, Supabase, etc.)
├── supabase/              # Database migrations and config
├── types.ts               # TypeScript types
├── vite.config.ts         # Vite configuration
├── package.json           # Project metadata and scripts
└── README.md              # This file
```

---

## Available Scripts

- `npm run dev` – Start the development server
- `npm run build` – Build the app for production
- `npm run preview` – Preview the production build

---

## Environment Variables

| Variable                | Description                        | Required |
|-------------------------|------------------------------------|----------|
| GEMINI_API_KEY          | Gemini API key                     | Yes      |
| GOOGLE_CLIENT_ID        | Google OAuth client ID             | No*      |
| GOOGLE_CLIENT_SECRET    | Google OAuth client secret         | No*      |

\* Only required for Google Calendar/Tasks integration.

---

## Deployment

To deploy your app, build it for production and serve the static files using your preferred hosting provider (Vercel, Netlify, Azure Static Web Apps, etc.):

```sh
npm run build
```

The output will be in the `dist/` directory.

---

## Integrations

- **Gemini API**: Handles AI chat responses.
- **Google Services**: (Optional) Integrate with Google Calendar and Tasks for enhanced productivity features.
- **Supabase**: (Optional) For persistent storage and user data.

---

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Support

For questions or support, please open an issue in the repository.

---

Would you like this README saved to your project?