import type { UserProfile } from '../components/ProfileCreation';
import { supabase } from './supabase';
import { logClientError, profileHttpUserMessage, profilePostUserMessage, profilePutUserMessage } from './userFacingErrors';

const API = '/api/profile';

async function readHttpErrorPayload(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { parseNote: 'not json', bodyPreview: text.slice(0, 500) };
  }
}

/** upload resized avatar; updates profiles.avatar_url server-side; requires signed-in owner */
export async function uploadProfileAvatar(profileId: string, imageBlob: Blob): Promise<{ avatarUrl: string }> {
  const { data: { session } } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  if (!session?.access_token) throw new Error('Sign in to upload a profile photo.');

  const name =
    imageBlob.type === 'image/png' ? 'avatar.png' : imageBlob.type === 'image/jpeg' ? 'avatar.jpg' : 'avatar.webp';
  const fd = new FormData();
  fd.set('profileId', profileId);
  fd.set('file', imageBlob, name);

  const res = await fetch(`${API}/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    logClientError('uploadProfileAvatar', res.status, err);
    throw new Error(typeof err.error === 'string' ? err.error : profileHttpUserMessage(res.status));
  }
  return res.json() as Promise<{ avatarUrl: string }>;
}

/** create profile, returns id. links to supabase user when session exists (google/email), or ownerAddress when wallet-only. */
export async function createProfile(profile: Omit<UserProfile, 'id'> & { ownerAddress?: string }): Promise<{ id: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data: { session } } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(API, {
    method: 'POST',
    headers,
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    logClientError('createProfile', res.status, err);
    throw new Error(profilePostUserMessage(res.status));
  }
  return res.json();
}

/** update existing profile by id */
export async function updateProfile(id: string, profile: Omit<UserProfile, 'id'>): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data: { session } } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    logClientError('updateProfile', res.status, err);
    throw new Error(profilePutUserMessage(res.status));
  }
}

/** fetch profile by supabase session (for returning google/email users) */
export async function fetchProfileBySession(): Promise<UserProfile | null> {
  const { data: { session } } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  if (!session?.access_token) return null;
  const res = await fetch(API, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await readHttpErrorPayload(res);
    logClientError('fetchProfileBySession', res.status, err);
    throw new Error(profileHttpUserMessage(res.status));
  }
  const data = await res.json();
  return {
    id: data.id,
    ethereumAddress: data.ethereumAddress ?? '',
    baseAddress: data.baseAddress,
    bitcoinAddress: data.bitcoinAddress,
    solanaAddress: data.solanaAddress ?? '',
    tezosAddress: data.tezosAddress ?? '',
    cashAppCashtag: data.cashAppCashtag,
    venmoUsername: data.venmoUsername,
    zelleContact: data.zelleContact,
    paypalUsername: data.paypalUsername,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
  };
}

/** fetch profile by id (for tip page) */
export async function fetchProfile(id: string): Promise<UserProfile> {
  const res = await fetch(`${API}/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("This tip page couldn't be found.");
    const err = await readHttpErrorPayload(res);
    logClientError('fetchProfile', res.status, err);
    throw new Error(profileHttpUserMessage(res.status));
  }
  const data = await res.json();
  return {
    id,
    ethereumAddress: data.ethereumAddress ?? '',
    baseAddress: data.baseAddress,
    bitcoinAddress: data.bitcoinAddress,
    solanaAddress: data.solanaAddress ?? '',
    tezosAddress: data.tezosAddress ?? '',
    cashAppCashtag: data.cashAppCashtag,
    venmoUsername: data.venmoUsername,
    zelleContact: data.zelleContact,
    paypalUsername: data.paypalUsername,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
  };
}
