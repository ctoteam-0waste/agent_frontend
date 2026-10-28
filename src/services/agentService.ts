import apiClient from '../api/apiClient';
import * as Location from 'expo-location';

export const agentService = {
  // Reads the device GPS and pushes it to the backend. Returns a result object (never
  // throws) so callers can order it — on go-online: send location, await the 200, then
  // set availability — and surface the status. Coordinates are [longitude, latitude]
  // (GeoJSON order). Never sends [0,0]: a missing permission or GPS fix returns ok:false.
  updateLocation: async (): Promise<{ ok: boolean; status?: number; reason?: any }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { ok: false, reason: 'permission denied' };
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = await apiClient.patch('/agents/location', {
        coordinates: [loc.coords.longitude, loc.coords.latitude],
      });
      console.log('[GPS] Location updated ✓', res.status);
      return { ok: true, status: res.status };
    } catch (err: any) {
      const reason = err?.response?.status ?? err?.message ?? 'error';
      console.log('[GPS] FAILED —', reason);
      return { ok: false, reason };
    }
  },

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
