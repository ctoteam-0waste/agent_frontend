import apiClient from '../api/apiClient';

export const agentService = {
  getProfile: async () => {
    try {
      const response = await apiClient.get('/agents/profile');
      return response.data?.data || response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to fetch profile');
    }
  },

  getTodaySummary: async () => {
    try {
      const response = await apiClient.get('/agents/summary/today');
      return response.data?.data || response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to fetch summary');
    }
  },

  toggleAvailability: async (isAvailable: boolean) => {
    try {
      console.log('[Agent] toggleAvailability →', isAvailable);
      const response = await apiClient.patch('/agents/profile', { isAvailable });
      console.log('[Agent] toggleAvailability response:', JSON.stringify(response.data));
      return response.data;
    } catch (error: any) {
      console.log('[Agent] toggleAvailability FAILED:', error?.response?.status, JSON.stringify(error?.response?.data));
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to update availability');
      }
      throw new Error(error.message || 'Network error occurred updating availability');
    }
  },
};
