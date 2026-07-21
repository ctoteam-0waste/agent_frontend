import apiClient from '../api/apiClient';

export interface MapSuggestion {
  placeName: string;
  address: string;
  eLoc: string;
  lat: number;
  lng: number;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
}

export interface RouteResult {
  distance: number;
  duration: number;
  polyline: string;
  steps: any[];
}

let _cachedKey: string | null = null;

async function getKey(): Promise<string> {
  if (_cachedKey) return _cachedKey;
  const response = await apiClient.get('/map/config');
  const key: string = response.data.data.mapSdkKey || response.data.data.accessToken;
  _cachedKey = key;
  return key;
}

export const mapService = {
  getMapConfig: async (): Promise<string> => {
    return getKey();
  },

  autosuggest: async (query: string, lat?: number, lng?: number): Promise<MapSuggestion[]> => {
    const params: Record<string, any> = { query };
    if (lat !== undefined) params.lat = lat;
    if (lng !== undefined) params.lng = lng;
    const response = await apiClient.get('/map/autosuggest', { params });
    return response.data.data || [];
  },

  reverseGeocode: async (lat: number, lng: number): Promise<ReverseGeocodeResult> => {
    const response = await apiClient.get('/map/reverse-geocode', { params: { lat, lng } });
    return response.data.data;
  },

  getBookingRoute: async (bookingId: string, agentLat: number, agentLng: number): Promise<RouteResult> => {
    const response = await apiClient.get(`/map/route/booking/${bookingId}`, {
      params: { lat: agentLat, lng: agentLng },
    });
    return response.data.data;
  },
};
