import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../services';

/**
 * Custom hook to initialize and manage the Supabase client
 * @returns The Supabase client and error state
 */
export function useSupabase() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const supabaseService = SupabaseService.getInstance();
      const supabaseClient = supabaseService.initialize();
      setClient(supabaseClient);
      setIsInitialized(true);
      console.log('Supabase initialized');
    } catch (err) {
      console.error('Failed to initialize Supabase:', err);
      setError('Failed to initialize Supabase. Some features may be unavailable.');
    }
  }, []);

  return { client, error, isInitialized };
}