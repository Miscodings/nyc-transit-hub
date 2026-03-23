/**
 * ApiService — thin wrapper around the Flask backend.
 * Only MTA transit data lives here; user data goes through SupabaseService.
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

class ApiService {
  async getServiceStatus() {
    const { data } = await axios.get(`${API_URL}/service-status`);
    return data;
  }

  async getStations() {
    const { data } = await axios.get(`${API_URL}/stations`);
    return data;
  }

  async getRoutePolylines() {
    const { data } = await axios.get(`${API_URL}/route-polylines`);
    return data;
  }

  async getArrivals(stationId) {
    const { data } = await axios.get(`${API_URL}/arrivals/${stationId}`);
    return data;
  }

  async healthCheck() {
    const { data } = await axios.get(`${API_URL}/health`);
    return data;
  }
}

export default new ApiService();
