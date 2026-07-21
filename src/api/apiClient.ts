import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Central base URL for the backend on Render.

export const BASE_URL = 'https://karmacoin-backend-10.onrender.com/api/v1';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds to accommodate Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatic authorization interceptor to inject stored token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('agentToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token for API request', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// On 401, clear the expired token so the app redirects to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await AsyncStorage.removeItem('agentToken');
      await AsyncStorage.removeItem('agentData');
      await AsyncStorage.removeItem('agentOnline');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
