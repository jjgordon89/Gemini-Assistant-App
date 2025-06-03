import { useState } from 'react';
import { Message, ChatRole, AiProviderType } from '../types';
import { Chat, FunctionCall, Part } from '@google/genai'; // Import FunctionCall and Part
import { ConversationMemoryService, WeatherService, NoteService, GoogleCalendarService, GoogleTasksService } from '../services'; // Import tool services

/**
 * Custom hook to manage chat messages and message sending
 * @param geminiChat Gemini chat instance
 * @param selectedProvider Current AI provider
 * @param memoryService Memory service instance
 * @param memoryEnabled Whether memory is enabled
 * @returns Message state and functions
 */
export function useChatMessages(
  geminiChat: Chat | null,
  selectedProvider: AiProviderType,
  memoryService: ConversationMemoryService | null,
  memoryEnabled: boolean,
  googleAccessToken: string | null // New parameter
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Store a message in memory if memory service is available and enabled
   */
  const storeMessageInMemory = async (message: Message) => {
    if (!memoryService || !memoryEnabled) return;
    
    try {
      await memoryService.storeMessage(message);
    } catch (err) {
      console.error("Failed to store message in memory:", err);
    }
  };

  /**
   * Get memory context for a message if memory service is available and enabled
   */
  const getMemoryContext = async (text: string): Promise<string> => {
    if (!memoryService || !memoryEnabled) return "";
    
    try {
      const context = await memoryService.generateContextualMemory(text, 3, 0.7);
      console.log("Memory context:", context);
      return context;
    } catch (err) {
      console.error("Failed to retrieve memory context:", err);
      return "";
    }
  };

  /**
   * Handle sending a message with the Gemini provider
   */
  const handleGeminiMessage = async (text: string, userMessage: Message, currentGoogleAccessToken: string | null) => {
    if (!geminiChat) {
      throw new Error("Gemini chat is not initialized. Check API Key.");
    }
    
    let accumulatedResponse = "";
    const streamingMessageId = 'ai-typing-' + Date.now();

    setMessages(prev => [...prev, { 
      id: streamingMessageId,
      text: 'AI is thinking...',
      sender: ChatRole.MODEL, 
      timestamp: new Date(), 
      streaming: true 
    }]);

    const memoryContext = await getMemoryContext(text);
    const messageContent = memoryContext ? `${memoryContext}\n\nUser query: ${text}` : text;

    let stream = await geminiChat.sendMessageStream(messageContent);
    let modelRespondedWithText = false;

    for await (const chunk of stream) {
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        modelRespondedWithText = false; // Reset if function call occurs
        const fc = chunk.functionCalls[0]; // Assuming one function call for now
        console.log("Function call requested:", fc);

        // Update UI: AI is using tool
        setMessages(prev => prev.map(msg =>
          msg.id === streamingMessageId ? { ...msg, text: `Using tool: ${fc.name}(${JSON.stringify(fc.args, null, 2)})` } : msg
        ));

        // Dispatch the tool call
        let toolResult;
        try {
          toolResult = await toolDispatch(fc.name, fc.args, currentGoogleAccessToken);
        } catch (toolError) {
          console.error("Tool dispatch error:", toolError);
          toolResult = { error: toolError instanceof Error ? toolError.message : String(toolError) };
        }

        console.log("Tool result:", toolResult);

        // Update UI: Tool responded
        const toolResponseMessage: Message = {
          id: Date.now().toString() + '-tool',
          text: `Tool ${fc.name} responded: ${JSON.stringify(toolResult, null, 2)}`,
          sender: ChatRole.MODEL, // Or a new role like ChatRole.TOOL
          timestamp: new Date(),
        };
        setMessages(prev => {
            const withoutStreaming = prev.filter(m => m.id !== streamingMessageId);
            return [...withoutStreaming, toolResponseMessage];
        });

        // Send tool response back to the model
        // The history is managed by the `geminiChat` (ChatSession) object.
        // We need to send a FunctionResponsePart.
        // The SDK expects an array of Parts for the message content.
        const functionResponsePart: Part = {
            functionResponse: {
                name: fc.name,
                response: toolResult,
            },
        };

        // Update the streaming message ID for the next phase
        // accumulatedResponse = ""; // Reset for final AI response
        setMessages(prev => [...prev, {
          id: streamingMessageId, // Re-use or create new for clarity? New might be better.
          text: 'AI is processing tool response...',
          sender: ChatRole.MODEL,
          timestamp: new Date(),
          streaming: true
        }]);

        stream = await geminiChat.sendMessageStream([functionResponsePart]);
        // Now loop through the new stream for the final text response
        for await (const newChunk of stream) {
            if (newChunk.text) {
                modelRespondedWithText = true;
                accumulatedResponse += newChunk.text;
                setMessages(prev => prev.map(msg =>
                    msg.id === streamingMessageId ? { ...msg, text: accumulatedResponse } : msg
                ));
            }
        }
        break; // Exit the initial loop as we've handled the function call and got a new stream
      } else if (chunk.text) {
        modelRespondedWithText = true;
        accumulatedResponse += chunk.text;
        setMessages(prev => prev.map(msg =>
          msg.id === streamingMessageId ? { ...msg, text: accumulatedResponse } : msg
        ));
      }
    } // End of initial stream processing

    // Finalize AI response message
    if (modelRespondedWithText || accumulatedResponse) { // Ensure there's text to finalize
        const aiResponseMessage: Message = {
          id: Date.now().toString() + '-ai-final',
          streaming: false,
          text: accumulatedResponse || "I've processed that request.", // Fallback if only function call happened
          sender: ChatRole.MODEL,
          timestamp: new Date()
        };

        setMessages(prev => prev.map(msg =>
            msg.id === streamingMessageId ? aiResponseMessage : msg
        ));
        await storeMessageInMemory(aiResponseMessage);
        return aiResponseMessage;
    } else {
        // If no text response from AI after tool call (or no tool call and no text), remove typing indicator
        setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId));
        // Potentially return a generic message or handle as an error/empty response
        const fallbackMsg = {
            id: Date.now().toString() + '-ai-fallback',
            text: "Request processed (no text response).",
            sender: ChatRole.MODEL,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackMsg]);
        await storeMessageInMemory(fallbackMsg);
        return fallbackMsg;
    }
  };

  // Helper function to dispatch tool calls
  const toolDispatch = async (toolName: string, args: any, currentGoogleAccessToken: string | null): Promise<any> => {
    console.log(`Dispatching tool: ${toolName}`, args, `with token: ${currentGoogleAccessToken ? 'YES' : 'NO'}`);
    // TODO: Pass currentGoogleAccessToken to services if they need it
    switch (toolName) {
      case 'getWeather': // This name must match the name in the tool schema provided to Gemini
        // Assuming args are { location: "city, country" } as per schema (hypothetically)
        // And weatherService.getWeather has been adapted to take a location string
        if (!args.location) throw new Error("Location not provided for getWeather");
        return WeatherService.getWeather(args.location);
      case 'addNote': // This name must match the name in the tool schema
        if (!args.content) throw new Error("Content not provided for addNote");
        return NoteService.addNote(args.content);
      case 'createCalendarEvent': // Name from createCalendarEventTool.name
        if (!currentGoogleAccessToken) {
          return { error: "User not authenticated with Google. Cannot create calendar event." };
        }
        if (!args.summary || !args.startTime || !args.endTime) {
          return { error: "Missing required arguments for createCalendarEvent (summary, startTime, endTime)." };
        }
        const eventData = {
          summary: args.summary,
          description: args.description || "",
          start: { dateTime: args.startTime }, // Expecting ISO 8601 string
          end: { dateTime: args.endTime },       // Expecting ISO 8601 string
          location: args.location || ""
        };
        try {
          const newEvent = await GoogleCalendarService.addCalendarEvent(currentGoogleAccessToken, eventData);
          // The service already returns the event object, which might include id, htmlLink etc.
          return { success: true, event: newEvent };
        } catch (e: any) {
          console.error("Error creating calendar event in toolDispatch:", e);
          return { error: `Failed to create calendar event: ${e.message || "Unknown error"}` };
        }
      case 'addTask': // Name from addTaskTool.name
        if (!currentGoogleAccessToken) {
          return { error: "User not authenticated with Google. Cannot add task." };
        }
        if (!args.title) {
          return { error: "Missing required argument for addTask (title)." };
        }
        const taskDetails = {
          title: args.title,
          notes: args.notes || "",
          due: args.dueDate // YYYY-MM-DD string, optional
        };
        const taskListId = args.taskListId || '@default';
        try {
          const newTask = await GoogleTasksService.addTask(currentGoogleAccessToken, taskListId, taskDetails);
          return { success: true, task: newTask };
        } catch (e: any) {
          console.error("Error adding task in toolDispatch:", e);
          return { error: `Failed to add task: ${e.message || "Unknown error"}` };
        }
      case 'searchCalendarEvents': // Name from searchCalendarEventsTool.name
        if (!currentGoogleAccessToken) {
          return { error: "User not authenticated with Google. Cannot search calendar events." };
        }
        try {
          const events = await GoogleCalendarService.searchCalendarEvents(
            currentGoogleAccessToken,
            args.query, // Optional
            args.timeMin, // Optional (ISO string)
            args.timeMax  // Optional (ISO string)
          );
          return { success: true, events };
        } catch (e: any) {
          console.error("Error searching calendar events in toolDispatch:", e);
          return { error: `Failed to search calendar events: ${e.message || "Unknown error"}` };
        }
      case 'updateCalendarEvent': // Name from updateCalendarEventTool.name
        if (!currentGoogleAccessToken) {
          return { error: "User not authenticated with Google. Cannot update calendar event." };
        }
        if (!args.eventId) {
          return { error: "Missing required argument eventId for updateCalendarEvent." };
        }
        const eventUpdates: any = {};
        if (args.summary) eventUpdates.summary = args.summary;
        if (args.description) eventUpdates.description = args.description;
        if (args.startTime) eventUpdates.start = { dateTime: args.startTime };
        if (args.endTime) eventUpdates.end = { dateTime: args.endTime };
        if (args.location) eventUpdates.location = args.location;

        if (Object.keys(eventUpdates).length === 0) {
          return { error: "No update parameters provided for updateCalendarEvent." };
        }
        try {
          const updatedEvent = await GoogleCalendarService.updateCalendarEvent(
            currentGoogleAccessToken,
            args.eventId,
            eventUpdates
          );
          return { success: true, event: updatedEvent };
        } catch (e: any) {
          console.error("Error updating calendar event in toolDispatch:", e);
          return { error: `Failed to update calendar event: ${e.message || "Unknown error"}` };
        }
      case 'deleteCalendarEvent': // Name from deleteCalendarEventTool.name
        if (!currentGoogleAccessToken) {
          return { error: "User not authenticated with Google. Cannot delete calendar event." };
        }
        if (!args.eventId) {
          return { error: "Missing required argument eventId for deleteCalendarEvent." };
        }
        try {
          await GoogleCalendarService.deleteCalendarEvent(currentGoogleAccessToken, args.eventId);
          return { success: true, message: "Event deleted successfully." };
        } catch (e: any) {
          console.error("Error deleting calendar event in toolDispatch:", e);
          return { error: `Failed to delete calendar event: ${e.message || "Unknown error"}` };
        }
      case 'searchTasks': // Name from searchTasksTool.name
        if (!currentGoogleAccessToken) {
          return { error: "User not authenticated with Google. Cannot search tasks." };
        }
        const searchOptions = {
          query: args.query,
          dueMin: args.dueAfter, // Map AI's 'dueAfter' to service's 'dueMin'
          dueMax: args.dueBefore, // Map AI's 'dueBefore' to service's 'dueMax'
          status: args.status,
        };
        const searchTaskListId = args.taskListId || '@default';
        try {
          const tasks = await GoogleTasksService.searchTasks(
            currentGoogleAccessToken,
            searchTaskListId,
            searchOptions
          );
          return { success: true, tasks };
        } catch (e: any) {
          console.error("Error searching tasks in toolDispatch:", e);
          return { error: `Failed to search tasks: ${e.message || "Unknown error"}` };
        }
      case 'updateTask': // Name from updateTaskTool.name
        if (!currentGoogleAccessToken) {
          return { error: "User not authenticated with Google. Cannot update task." };
        }
        if (!args.taskId) {
          return { error: "Missing required argument taskId for updateTask." };
        }
        const taskUpdates: any = {};
        if (args.title) taskUpdates.title = args.title;
        if (args.notes) taskUpdates.notes = args.notes;
        if (args.dueDate) taskUpdates.due = args.dueDate; // Service expects 'due'
        if (args.status) taskUpdates.status = args.status;

        if (Object.keys(taskUpdates).length === 0) {
          return { error: "No update parameters provided for updateTask." };
        }
        const updateTaskListId = args.taskListId || '@default';
        try {
          const updatedTask = await GoogleTasksService.updateTask(
            currentGoogleAccessToken,
            updateTaskListId,
            args.taskId,
            taskUpdates
          );
          return { success: true, task: updatedTask };
        } catch (e: any) {
          console.error("Error updating task in toolDispatch:", e);
          return { error: `Failed to update task: ${e.message || "Unknown error"}` };
        }
      case 'deleteTask': // Name from deleteTaskTool.name
        if (!currentGoogleAccessToken) {
          return { error: "User not authenticated with Google. Cannot delete task." };
        }
        if (!args.taskId) {
          return { error: "Missing required argument taskId for deleteTask." };
        }
        const deleteTaskListId = args.taskListId || '@default';
        try {
          await GoogleTasksService.deleteTask(currentGoogleAccessToken, deleteTaskListId, args.taskId);
          return { success: true, message: "Task deleted successfully." };
        } catch (e: any) {
          console.error("Error deleting task in toolDispatch:", e);
          return { error: `Failed to delete task: ${e.message || "Unknown error"}` };
        }
      // Add other tools here
      default:
        console.error(`Unknown tool called: ${toolName}`);
        throw new Error(`Tool "${toolName}" is not available.`);
    }
  };

  /**
   * Handle sending a message with other providers (placeholder)
   */
  const handleOtherProviderMessage = async (text: string) => {
    // Placeholder for other AI providers
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    const aiResponse: Message = {
      id: Date.now().toString() + '-ai',
      text: `Response from ${selectedProvider}: ${text} (Not implemented yet)`,
      sender: ChatRole.MODEL,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, aiResponse]);
    
    // Store AI response in memory
    await storeMessageInMemory(aiResponse);
    
    return aiResponse;
  };

  /**
   * Send a message and get a response
   */
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      text, 
      sender: ChatRole.USER, 
      timestamp: new Date() 
    };
    
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Store user message in memory
      await storeMessageInMemory(newUserMessage);
      
      // Process based on provider
      if (selectedProvider === AiProviderType.GEMINI) {
        await handleGeminiMessage(text, newUserMessage, googleAccessToken);
      } else {
        await handleOtherProviderMessage(text);
      }
    } catch (e) {
      console.error("Error sending message:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to get response: ${errorMessage}`);
      setMessages(prevMessages => [...prevMessages, {
        id: Date.now().toString() + '-error', 
        text: `Error: ${errorMessage}`, 
        sender: ChatRole.MODEL, 
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.filter(msg => !(msg.id === 'ai-typing' && msg.text === '')));
    }
  };

  return {
    messages,
    setMessages,
    isLoading,
    error,
    setError,
    sendMessage
  };
}