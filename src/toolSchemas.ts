// toolSchemas.ts
import { FunctionDeclaration, Schema, Type } from "@google/genai";

export const createCalendarEventTool: FunctionDeclaration = {
  name: "createCalendarEvent",
  description: "Creates a new event in the user's Google Calendar. Requires user to be logged into Google. Interpret natural language dates/times (e.g., 'next Friday at noon', 'tomorrow 3pm') and convert to ISO 8601 for startTime and endTime.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "The title or summary of the event." },
      description: { type: Type.STRING, description: "A more detailed description of the event." },
      startTime: { type: Type.STRING, description: "The start date and time of the event in ISO 8601 format (e.g., YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss±HH:mm). Convert natural language like 'tomorrow 3pm' to this format." },
      endTime: { type: Type.STRING, description: "The end date and time of the event in ISO 8601 format. Convert natural language like 'next Monday 5pm' to this format." },
      location: { type: Type.STRING, description: "The location of the event." },
    },
    required: ["summary", "startTime", "endTime"],
  },
};

export const addTaskTool: FunctionDeclaration = {
  name: "addTask",
  description: "Adds a new task to the user's Google Tasks. Requires user to be logged into Google. Interpret natural language for dueDate (e.g., 'next Wednesday') and convert to YYYY-MM-DD format.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the task." },
      notes: { type: Type.STRING, description: "Additional details or notes for the task." },
      dueDate: { type: Type.STRING, description: "The due date of the task in YYYY-MM-DD ISO 8601 format. Convert natural language like 'by Friday' to this format." },
      taskListId: { type: Type.STRING, description: "Optional ID of the task list to add to. Defaults to the primary task list."}
    },
    required: ["title"],
  },
};

export const getWeatherTool: FunctionDeclaration = {
  name: "getWeather",
  description: "Gets the current weather for a specified location.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING, description: "The city and state, or city and country, e.g., San Francisco, CA or London, UK." },
    },
    required: ["location"],
  },
};

// Google Calendar
export const searchCalendarEventsTool: FunctionDeclaration = {
  name: "searchCalendarEvents",
  description: "Searches for events in the user's Google Calendar based on a query, date range, or both. Requires user to be logged into Google. Interpret natural language dates/times for timeMin and timeMax and convert to ISO 8601 format.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Text to search for in event summaries, descriptions, or locations." },
      timeMin: { type: Type.STRING, description: "The start of the date range for the search, in ISO 8601 format (e.g., YYYY-MM-DDTHH:mm:ssZ). Convert natural language like 'start of next week' to this format. If not provided, searches from the current time." },
      timeMax: { type: Type.STRING, description: "The end of the date range for the search, in ISO 8601 format. Convert natural language like 'end of next month' to this format. If not provided, no upper bound on time." },
    },
    required: [], 
  },
};

export const updateCalendarEventTool: FunctionDeclaration = {
  name: "updateCalendarEvent",
  description: "Updates an existing event in the user's Google Calendar. Requires the eventId. Requires user to be logged into Google. Interpret natural language dates/times for startTime and endTime and convert to ISO 8601 format.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: { type: Type.STRING, description: "The ID of the calendar event to update." },
      summary: { type: Type.STRING, description: "The new title or summary for the event." },
      description: { type: Type.STRING, description: "The new detailed description for the event." },
      startTime: { type: Type.STRING, description: "The new start date and time in ISO 8601 format. Convert natural language to this format." },
      endTime: { type: Type.STRING, description: "The new end date and time in ISO 8601 format. Convert natural language to this format." },
      location: { type: Type.STRING, description: "The new location for the event." },
    },
    required: ["eventId"], 
  },
};

export const deleteCalendarEventTool: FunctionDeclaration = {
  name: "deleteCalendarEvent",
  description: "Deletes an event from the user's Google Calendar. Requires the eventId. Requires user to be logged into Google.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: { type: Type.STRING, description: "The ID of the calendar event to delete." },
    },
    required: ["eventId"],
  },
};

// Google Tasks
export const searchTasksTool: FunctionDeclaration = {
  name: "searchTasks",
  description: "Searches for tasks in the user's Google Tasks. Can filter by query, due date, or status. Requires user to be logged into Google. Interpret natural language for dueBefore/dueAfter and convert to YYYY-MM-DD format.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskListId: { type: Type.STRING, description: "Optional ID of the task list to search within. Defaults to the primary task list." },
      query: { type: Type.STRING, description: "Text to search for in task titles or notes." },
      dueBefore: { type: Type.STRING, description: "Filter for tasks due before this ISO 8601 date (YYYY-MM-DD). Convert natural language to this format." },
      dueAfter: { type: Type.STRING, description: "Filter for tasks due after this ISO 8601 date (YYYY-MM-DD). Convert natural language to this format." },
      status: { type: Type.STRING, enum: ["needsAction", "completed"], description: "Filter by task status." },
    },
    required: [], 
  },
};

export const updateTaskTool: FunctionDeclaration = {
  name: "updateTask",
  description: "Updates an existing task in Google Tasks (e.g., title, notes, due date, status). Requires taskId. Requires user to be logged into Google. Interpret natural language for dueDate and convert to YYYY-MM-DD format.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: "The ID of the task to update." },
      taskListId: { type: Type.STRING, description: "Optional ID of the task list. Defaults to the primary task list." },
      title: { type: Type.STRING, description: "The new title for the task." },
      notes: { type: Type.STRING, description: "The new notes for the task." },
      dueDate: { type: Type.STRING, description: "The new due date in YYYY-MM-DD ISO 8601 format. Convert natural language to this format." },
      status: { type: Type.STRING, enum: ["needsAction", "completed"], description: "The new status for the task." },
    },
    required: ["taskId"], 
  },
};

export const deleteTaskTool: FunctionDeclaration = {
  name: "deleteTask",
  description: "Deletes a task from Google Tasks. Requires taskId. Requires user to be logged into Google.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: "The ID of the task to delete." },
      taskListId: { type: Type.STRING, description: "Optional ID of the task list. Defaults to the primary task list." },
    },
    required: ["taskId"],
  },
};

// --- Local Note Tools ---
export const addNoteTool: FunctionDeclaration = {
  name: "addNote",
  description: "Adds a new local note for the user. Notes are stored in the browser.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The content of the note to be saved." },
    },
    required: ["content"],
  },
};

export const viewNotesTool: FunctionDeclaration = {
  name: "viewNotes",
  description: "Retrieves all local notes for the user. Can optionally filter by a query string (client-side).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Optional text to filter notes by. The AI can use this to pre-filter or can summarize all notes if not provided." },
    },
    required: [],
  },
};

export const deleteNoteTool: FunctionDeclaration = {
  name: "deleteNote",
  description: "Deletes a specific local note by its ID. The AI should list notes first if the ID is unknown.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      noteId: { type: Type.STRING, description: "The ID of the note to delete." },
    },
    required: ["noteId"],
  },
};


export const allTools = [
    createCalendarEventTool,
    addTaskTool,
    getWeatherTool,
    searchCalendarEventsTool,
    updateCalendarEventTool,
    deleteCalendarEventTool,
    searchTasksTool,
    updateTaskTool,
    deleteTaskTool,
    addNoteTool,
    viewNotesTool,
    deleteNoteTool,
];