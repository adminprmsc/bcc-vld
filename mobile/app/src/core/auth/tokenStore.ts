import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'prmsc-auth-token';

export async function getAuthToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to read auth token', error);
    return null;
  }
}

export async function setAuthToken(token: string | null) {
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist auth token', error);
  }
}
