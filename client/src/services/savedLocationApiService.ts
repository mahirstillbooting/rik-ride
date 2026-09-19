import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../config/env';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface SavedLocationItem {
  _id: string;
  id?: string;
  name: string;
  address: string;
  type: 'HOME' | 'WORK' | 'FAVORITE';
  latitude: number;
  longitude: number;
}

export const savedLocationApiService = {
  getSavedLocations: async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/passenger/saved-locations`, {
        method: 'GET',
        headers,
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch saved locations.' };
    }
  },

  addSavedLocation: async (payload: { name: string; address: string; type: string; latitude: number; longitude: number }) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/passenger/saved-locations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add saved location.' };
    }
  },

  deleteSavedLocation: async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/passenger/saved-locations/${id}`, {
        method: 'DELETE',
        headers,
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete saved location.' };
    }
  },
};
