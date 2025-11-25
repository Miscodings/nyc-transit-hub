import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

class ApiService {
  // ==================== Service Status ====================
  
  async getServiceStatus() {
    try {
      const response = await axios.get(`${API_URL}/service-status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching service status:', error);
      throw error;
    }
  }

  // ==================== Stations ====================
  
  async getStations() {
    try {
      const response = await axios.get(`${API_URL}/stations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stations:', error);
      throw error;
    }
  }

  async getRoutePolylines() {
    try {
      const response = await axios.get(`${API_URL}/route-polylines`);
      return response.data;
    } catch (error) {
      console.error('Error fetching route polylines:', error);
      throw error;
    }
  }

  async getArrivals(stationId) {
    try {
      const response = await axios.get(`${API_URL}/arrivals/${stationId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching arrivals:', error);
      throw error;
    }
  }

  // ==================== Favorites ====================
  
  async getFavorites(firebaseUid) {
    try {
      const response = await axios.get(`${API_URL}/favorites`, {
        params: { firebase_uid: firebaseUid }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  }

  async addFavorite(firebaseUid, routeId, routeType) {
    try {
      const response = await axios.post(`${API_URL}/favorites`, {
        firebase_uid: firebaseUid,
        route_id: routeId,
        route_type: routeType
      });
      return response.data;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  async deleteFavorite(favoriteId) {
    try {
      const response = await axios.delete(`${API_URL}/favorites/${favoriteId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting favorite:', error);
      throw error;
    }
  }

  // ==================== Alerts ====================
  
  async getAlerts(firebaseUid) {
    try {
      const response = await axios.get(`${API_URL}/alerts`, {
        params: { firebase_uid: firebaseUid }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  }

  async createAlert(firebaseUid, routeId, alertType) {
    try {
      const response = await axios.post(`${API_URL}/alerts`, {
        firebase_uid: firebaseUid,
        route_id: routeId,
        alert_type: alertType
      });
      return response.data;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  async deleteAlert(alertId) {
    try {
      const response = await axios.delete(`${API_URL}/alerts/${alertId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  }

  // ==================== Health Check ====================
  
  async healthCheck() {
    try {
      const response = await axios.get(`${API_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Error in health check:', error);
      throw error;
    }
  }
}

export default new ApiService();