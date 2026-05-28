import { Platform } from 'react-native';
import { getSupabase } from '../lib/supabase';

const isWebRuntime = () => Platform.OS === 'web' && typeof window !== 'undefined';

const AuthService = {
  async signInWithGoogle() {
    const sb = getSupabase();
    if (!sb) return { data: null, error: { message: 'auth-web-only' } };
    return sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },

  async signInWithApple() {
    const sb = getSupabase();
    if (!sb) return { data: null, error: { message: 'auth-web-only' } };
    return sb.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
  },

  async signOut() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  },

  async getSession() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  },

  async getUser() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  },

  async getAccessToken() {
    const session = await this.getSession();
    return session?.access_token || null;
  },

  onAuthStateChange(callback) {
    const sb = getSupabase();
    if (!sb) return () => {};
    const { data } = sb.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data?.subscription?.unsubscribe?.();
  },

  isWeb: isWebRuntime,
};

export default AuthService;
