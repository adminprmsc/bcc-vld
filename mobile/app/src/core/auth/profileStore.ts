import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from '../types';

const PROFILE_KEY = 'prmsc-auth-profile';

export async function getCachedProfile(): Promise<UserProfile | null> {
  try {
    const value = await SecureStore.getItemAsync(PROFILE_KEY);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as UserProfile;
  } catch (error) {
    console.warn('Failed to read cached profile', error);
    return null;
  }
}

export async function setCachedProfile(profile: UserProfile): Promise<void> {
  try {
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn('Failed to persist cached profile', error);
  }
}

export async function clearCachedProfile(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PROFILE_KEY);
  } catch (error) {
    console.warn('Failed to clear cached profile', error);
  }
}
