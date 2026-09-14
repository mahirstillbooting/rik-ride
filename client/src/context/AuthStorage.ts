import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@rik_ride_auth_token';
const USER_KEY = '@rik_ride_auth_user';

export const AuthStorage = {
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('[AuthStorage] Error saving token:', e);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error('[AuthStorage] Error getting token:', e);
      return null;
    }
  },

  async saveUser(user: Record<string, unknown>): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('[AuthStorage] Error saving user:', e);
    }
  },

  async getUser(): Promise<Record<string, unknown> | null> {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[AuthStorage] Error getting user:', e);
      return null;
    }
  },

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('[AuthStorage] Error clearing session:', e);
    }
  },
};
