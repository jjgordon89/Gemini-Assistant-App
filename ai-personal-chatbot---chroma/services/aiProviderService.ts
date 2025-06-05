// AI Provider Service Interface and Implementations
import { AiProviderType, Message, ChatRole } from '../types';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

export interface AIProviderService {
  sendMessage(message: string, context?: string): Promise<string>;
  sendMessageStream(message: string, context?: string): AsyncGenerator<string, void, unknown>;
}

export class OpenAIService implements AIProviderService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  
  async sendMessage(message: string, context?: string): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant with memory. You can recall past conversations when relevant.'
      }
    ];
    
    if (context) {
      messages.push({
        role: 'system',
        content: `Previous conversation context: ${context}`
      });
    }
    
    messages.push({
      role: 'user',
      content: message
    });
    
    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content || 'No response generated';
  }
  
  async *sendMessageStream(message: string, context?: string): AsyncGenerator<string, void, unknown> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant with memory. You can recall past conversations when relevant.'
      }
    ];
    
    if (context) {
      messages.push({
        role: 'system',
        content: `Previous conversation context: ${context}`
      });
    }
    
    messages.push({
      role: 'user',
      content: message
    });
    
    const stream = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

export class GroqService implements AIProviderService {
  private client: Groq;
  
  constructor(apiKey: string) {
    this.client = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  }
  
  async sendMessage(message: string, context?: string): Promise<string> {
    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant with memory. You can recall past conversations when relevant.'
      }
    ];
    
    if (context) {
      messages.push({
        role: 'system',
        content: `Previous conversation context: ${context}`
      });
    }
    
    messages.push({
      role: 'user',
      content: message
    });
    
    const response = await this.client.chat.completions.create({
      model: 'llama3-8b-8192',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content || 'No response generated';
  }
  
  async *sendMessageStream(message: string, context?: string): AsyncGenerator<string, void, unknown> {
    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant with memory. You can recall past conversations when relevant.'
      }
    ];
    
    if (context) {
      messages.push({
        role: 'system',
        content: `Previous conversation context: ${context}`
      });
    }
    
    messages.push({
      role: 'user',
      content: message
    });
    
    const stream = await this.client.chat.completions.create({
      model: 'llama3-8b-8192',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

export class HuggingFaceService implements AIProviderService {
  private client: HfInference;
  
  constructor(apiKey: string) {
    this.client = new HfInference(apiKey);
  }
  
  async sendMessage(message: string, context?: string): Promise<string> {
    const prompt = context 
      ? `Context: ${context}\n\nUser: ${message}\nAssistant:` 
      : `User: ${message}\nAssistant:`;
    
    const response = await this.client.textGeneration({
      model: 'microsoft/DialoGPT-medium',
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        return_full_text: false,
      },
    });
    
    return response.generated_text || 'No response generated';
  }
  
  async *sendMessageStream(message: string, context?: string): AsyncGenerator<string, void, unknown> {
    // HuggingFace doesn't support streaming in the same way, so we'll simulate it
    const response = await this.sendMessage(message, context);
    
    // Simulate streaming by yielding chunks
    const chunkSize = 10;
    for (let i = 0; i < response.length; i += chunkSize) {
      yield response.slice(i, i + chunkSize);
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

export class OpenRouterService implements AIProviderService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      dangerouslyAllowBrowser: true,
    });
  }
  
  async sendMessage(message: string, context?: string): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant with memory. You can recall past conversations when relevant.'
      }
    ];
    
    if (context) {
      messages.push({
        role: 'system',
        content: `Previous conversation context: ${context}`
      });
    }
    
    messages.push({
      role: 'user',
      content: message
    });
    
    const response = await this.client.chat.completions.create({
      model: 'anthropic/claude-3-haiku',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content || 'No response generated';
  }
  
  async *sendMessageStream(message: string, context?: string): AsyncGenerator<string, void, unknown> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant with memory. You can recall past conversations when relevant.'
      }
    ];
    
    if (context) {
      messages.push({
        role: 'system',
        content: `Previous conversation context: ${context}`
      });
    }
    
    messages.push({
      role: 'user',
      content: message
    });
    
    const stream = await this.client.chat.completions.create({
      model: 'anthropic/claude-3-haiku',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

export function createAIProviderService(provider: AiProviderType, apiKey: string): AIProviderService {
  switch (provider) {
    case AiProviderType.OPENAI:
      return new OpenAIService(apiKey);
    case AiProviderType.GROQ:
      return new GroqService(apiKey);
    case AiProviderType.HUGGINGFACE:
      return new HuggingFaceService(apiKey);
    case AiProviderType.OPENROUTER:
      return new OpenRouterService(apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
