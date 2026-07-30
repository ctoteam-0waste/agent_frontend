import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifySessionInvalid } from '../utils/authEvents';

// Central base URL for the backend on Render.

export const BASE_URL = 'https://karmacoin-backend-testing.onrender.com/api/v1';

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

// On 401 from an already-authenticated request (not the login call itself —
// wrong-password login attempts are also 401s, but those aren't a session
// problem), hand off to AuthContext to clear the session and notify the user.
// This covers both plain token expiry and a newer login elsewhere having
// superseded this device's session.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error?.config?.url?.includes('/auth/login');
    if (error?.response?.status === 401 && !isLoginRequest) {
      notifySessionInvalid(error?.response?.data?.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
