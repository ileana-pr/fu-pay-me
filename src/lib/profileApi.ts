import type { UserProfile } from '../components/ProfileCreation';

const API = '/api/profile';

/** create profile, returns id */
export async function createProfile(profile: Omit<UserProfile, 'id'>): Promise<{ id: string }> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to save profile');
  }
  return res.json();
}

/** update existing profile by id */
export async function updateProfile(id: string, profile: Omit<UserProfile, 'id'>): Promise<void> {
  const res = await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update profile');
  }
}

/** fetch profile by id (for tip page) */
export async function fetchProfile(id: string): Promise<UserProfile> {
  const res = await fetch(`${API}/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Profile not found');
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch profile');
  }
  const data = await res.json();
  return {
    id,
    ethereumAddress: data.ethereumAddress ?? '',
    baseAddress: data.baseAddress,
    bitcoinAddress: data.bitcoinAddress,
    solanaAddress: data.solanaAddress ?? '',
    cashAppCashtag: data.cashAppCashtag,
    venmoUsername: data.venmoUsername,
    zelleContact: data.zelleContact,
    paypalUsername: data.paypalUsername,
  };
}
