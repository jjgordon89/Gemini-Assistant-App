import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// These should be set in your environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient | null = null;
  private isInitialized = false;
  
  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  /**
   * Initialize the Supabase client
   */
  public initialize(): SupabaseClient {
    if (!this.isInitialized) {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase URL and anon key must be provided. Check your environment variables.');
      }
      
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this.isInitialized = true;
      console.log('Supabase client initialized');
    }
    
    if (!this.client) {
      throw new Error('Supabase client initialization failed');
    }
    
    return this.client;
  }

  /**
   * Get the Supabase client instance
   */
  public getClient(): SupabaseClient {
    if (!this.client) {
      return this.initialize();
    }
    return this.client;
  }
}

export default SupabaseService;