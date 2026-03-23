/**
 * ApiService — thin wrapper around the Flask backend.
 * Only MTA transit data lives here; user data goes through SupabaseService.
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL });

class ApiService {
  async getServiceStatus() {
    const { data } = await api.get('/service-status', { timeout: 30000 });
    return data;
  }

  async getStations() {
    const { data } = await api.get('/stations', { timeout: 30000 });
    return data;
  }

  async getRoutePolylines() {
    const { data } = await api.get('/route-polylines', { timeout: 90000 });
    return data;
  }

  async getArrivals(stationId) {
    const { data } = await api.get(`/arrivals/${stationId}`, { timeout: 30000 });
    return data;
  }

  async healthCheck() {
    const { data } = await api.get('/health', { timeout: 10000 });
    return data;
  }
}

export default new ApiService();
