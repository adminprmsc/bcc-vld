import { jwtDecode } from 'jwt-decode';
import type { UserProfile } from '../types';
import { authenticate, fetchProfile, type Credentials } from './identityClient';
import { clearCachedProfile, getCachedProfile, setCachedProfile } from './profileStore';

interface TokenPayload {
  userId?: string;
  sub?: string;
}

export async function signInWithCredentials(credentials: Credentials): Promise<{ token: string; profile: UserProfile }> {
  const result = await authenticate(credentials);
  await setCachedProfile(result.profile);
  return result;
}

export async function resolveProfileForToken(token: string): Promise<UserProfile | null> {
  if (!token) {
    return null;
  }

  const cached = await getCachedProfile();
  const userId = cached?.id ?? extractUserId(token);
  if (!userId) {
    return cached;
  }

  try {
    const profile = await fetchProfile(userId, token);
    await setCachedProfile(profile);
    return profile;
  } catch (error) {
    const status = (error as any)?.status;
    if (status === 401 || status === 403) {
      return null;
    }
    if (cached) {
      console.warn('Unable to refresh profile, using cached data', error);
      return cached;
    }
    throw error;
  }
}

export async function clearPersistedSession() {
  await clearCachedProfile();
}

function extractUserId(token: string): string | undefined {
  try {
    const payload = jwtDecode<TokenPayload>(token);
    return payload.userId ?? payload.sub;
  } catch (error) {
    console.warn('Failed to decode auth token', error);
    return undefined;
  }
}

export type { Credentials };
