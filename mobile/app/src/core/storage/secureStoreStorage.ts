import * as SecureStore from 'expo-secure-store';

export interface PersistStorage {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

export function createSecureStoreStorage(namespace: string): PersistStorage {
  const keyFor = (name: string) => `${namespace}:${name}`;
  return {
    getItem: async name => {
      try {
        return await SecureStore.getItemAsync(keyFor(name));
      } catch (error) {
        console.warn('SecureStore get error', error);
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        await SecureStore.setItemAsync(keyFor(name), value);
      } catch (error) {
        console.warn('SecureStore set error', error);
      }
    },
    removeItem: async name => {
      try {
        await SecureStore.deleteItemAsync(keyFor(name));
      } catch (error) {
        console.warn('SecureStore remove error', error);
      }
    }
  };
}
