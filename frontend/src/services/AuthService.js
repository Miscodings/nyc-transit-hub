import { supabase } from '../supabase-config';

class AuthService {
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return data.user;
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.user;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  getCurrentUser() {
    // supabase.auth.getUser() is async; use the cached session for sync access
    return supabase.auth.getSession().then(({ data }) => data?.session?.user ?? null);
  }

  onAuthStateChange(callback) {
    // Supabase fires 'SIGNED_IN', 'SIGNED_OUT', etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    // Return an unsubscribe function matching Firebase's pattern
    return () => subscription.unsubscribe();
  }
}

export default new AuthService();
