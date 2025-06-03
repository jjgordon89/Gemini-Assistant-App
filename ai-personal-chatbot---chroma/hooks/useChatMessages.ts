import { useState } from 'react';
import { Message, ChatRole, AiProviderType } from '../types';
import { Chat, FunctionCall, Part } from '@google/genai'; // Import FunctionCall and Part
import { ConversationMemoryService, WeatherService, NoteService } from '../services'; // Import tool services

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
  memoryEnabled: boolean
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
  const handleGeminiMessage = async (text: string, userMessage: Message) => {
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
          toolResult = await toolDispatch(fc.name, fc.args);
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
  const toolDispatch = async (toolName: string, args: any): Promise<any> => {
    console.log(`Dispatching tool: ${toolName}`, args);
    switch (toolName) {
      case 'getWeather': // This name must match the name in the tool schema provided to Gemini
        // Assuming args are { location: "city, country" } as per schema (hypothetically)
        // And weatherService.getWeather has been adapted to take a location string
        if (!args.location) throw new Error("Location not provided for getWeather");
        return WeatherService.getWeather(args.location);
      case 'addNote': // This name must match the name in the tool schema
        if (!args.content) throw new Error("Content not provided for addNote");
        return NoteService.addNote(args.content);
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
        await handleGeminiMessage(text, newUserMessage);
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