/**
 * SupabaseService — favorites & alerts using the anon Supabase client.
 * RLS is disabled; queries are filtered by Clerk user ID directly.
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

class SupabaseService {
  // ── Favorites ──────────────────────────────────────────────────────────

  async getFavorites(userId) {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async addFavorite(userId, routeId, routeType) {
    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, route_id: routeId, route_type: routeType })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteFavorite(favoriteId) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);
    if (error) throw new Error(error.message);
  }

  // ── Alerts ─────────────────────────────────────────────────────────────

  async getAlerts(userId) {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async createAlert(userId, routeId, alertType) {
    const { data, error } = await supabase
      .from('alerts')
      .insert({ user_id: userId, route_id: routeId, alert_type: alertType })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteAlert(alertId) {
    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId);
    if (error) throw new Error(error.message);
  }
}

export default new SupabaseService();
