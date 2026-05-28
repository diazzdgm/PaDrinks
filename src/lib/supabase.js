import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

let _client = null;

export function getSupabase() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (_client) return _client;

  const { createClient } = require('@supabase/supabase-js');
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      flowType: 'pkce',
    },
  });
  return _client;
}
