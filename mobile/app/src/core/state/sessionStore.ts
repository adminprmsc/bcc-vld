import { create } from 'zustand';
import type { SessionStatus, UserProfile } from '../types';

interface SessionState {
  status: SessionStatus;
  profile?: UserProfile;
  error?: string;
  setStatus: (status: SessionStatus) => void;
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  setError: (message?: string) => void;
  reset: () => void;
}

const initialState: Pick<SessionState, 'status' | 'profile' | 'error'> = {
  status: 'idle',
  profile: undefined,
  error: undefined
};

export const useSessionStore = create<SessionState>(set => ({
  ...initialState,
  setStatus: status =>
    set(state => ({
      status,
      error: status === 'error' ? state.error : undefined
    })),
  setProfile: profile =>
    set(() => ({
      profile,
      status: 'authenticated',
      error: undefined
    })),
  clearProfile: () =>
    set(() => ({
      profile: undefined,
      status: 'unauthenticated',
      error: undefined
    })),
  setError: message =>
    set(() => ({
      error: message,
      status: 'error'
    })),
  reset: () =>
    set(() => ({
      ...initialState,
      status: 'unauthenticated'
    }))
}));
