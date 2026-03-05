import { API_URL } from '../config/env';
import type { UserProfile, UserRole } from '../types';

interface Credentials {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: BackendUser;
}

interface BackendUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  tehsilId?: string;
  districtId?: string;
}

const ROLE_MAP: Record<string, UserRole> = {
  'RA Environment': 'ra-environment',
  'BCC Officer Tehsil': 'bcc-officer',
  'BCC Officer': 'bcc-officer',
  'PCRWR Sampler': 'pcrwr-sampler',
  'PCRWR Lab': 'pcrwr-lab',
  'Tehsil Manager': 'tm',
  'District Manager': 'dm',
  'DM Tehsil': 'dm'
};

function mapRole(role?: string): UserRole {
  const normalized = (role ?? '').trim();
  const mapped = ROLE_MAP[normalized];
  if (!mapped) {
    throw new Error(`Unsupported mobile persona for role "${role ?? 'unknown'}"`);
  }
  return mapped;
}

function normalizeUser(user: BackendUser): UserProfile {
  const primaryRole = mapRole(user.role);
  return {
    id: user.id ?? user._id ?? '',
    name: user.name ?? 'Field Operator',
    email: user.email,
    roles: [primaryRole],
    primaryRole,
    tehsilId: user.tehsilId,
    districtId: user.districtId
  };
}

export async function authenticate(credentials: Credentials): Promise<{ token: string; profile: UserProfile }> {
  const response = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const payload = await safeParse(response);
    const message = payload?.msg ?? 'Unable to sign in';
    throw new Error(message);
  }

  const json = (await response.json()) as LoginResponse;
  if (!json?.token || !json?.user) {
    throw new Error('Malformed login response');
  }

  return {
    token: json.token,
    profile: normalizeUser(json.user)
  };
}

export async function fetchProfile(userId: string, token: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const payload = await safeParse(response);
    const message = payload?.msg ?? `Unable to load profile (${response.status})`;
    const error = new Error(message);
    (error as any).status = response.status;
    throw error;
  }

  const user = (await response.json()) as BackendUser;
  return normalizeUser(user);
}

async function safeParse(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export type { Credentials };
