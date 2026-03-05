import { useCallback } from 'react';
import { getAuthToken, setAuthToken } from '../auth/tokenStore';
import {
  signInWithCredentials,
  resolveProfileForToken,
  clearPersistedSession,
  type Credentials
} from '../auth/sessionService';
import { useSessionStore } from '../state/sessionStore';

export function useSessionStatus() {
  return useSessionStore(state => state.status);
}

export function useSessionError() {
  return useSessionStore(state => state.error);
}

export function useSessionProfile() {
  return useSessionStore(state => state.profile);
}

export function useSessionActions() {
  const setStatus = useSessionStore(state => state.setStatus);
  const setProfile = useSessionStore(state => state.setProfile);
  const clearProfile = useSessionStore(state => state.clearProfile);
  const setError = useSessionStore(state => state.setError);
  const reset = useSessionStore(state => state.reset);

  const initialize = useCallback(async () => {
    setStatus('checking');
    try {
      const token = await getAuthToken();
      if (!token) {
        await clearPersistedSession();
        clearProfile();
        return;
      }
      const profile = await resolveProfileForToken(token);
      if (!profile) {
        await setAuthToken(null);
        await clearPersistedSession();
        clearProfile();
        return;
      }
      setProfile(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to restore session';
      console.warn('Session bootstrap failed', error);
      setError(message);
    }
  }, [clearProfile, setError, setProfile, setStatus]);

  const signIn = useCallback(
    async (credentials: Credentials) => {
      setStatus('authenticating');
      try {
        const { token, profile } = await signInWithCredentials(credentials);
        await setAuthToken(token);
        setProfile(profile);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication failed';
        console.warn('Sign-in failed', error);
        setError(message);
      }
    },
    [setError, setProfile, setStatus]
  );

  const signOut = useCallback(async () => {
    try {
      await setAuthToken(null);
      await clearPersistedSession();
    } finally {
      reset();
    }
  }, [reset]);

  return {
    initialize,
    signIn,
    signOut
  };
}
