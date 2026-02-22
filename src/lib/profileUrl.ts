import type { UserProfile } from '../components/ProfileCreation';

// short keys for url — keeps shared links readable in chat (no backend)
const SHORT: Record<string, string> = {
  ethereumAddress: 'e',
  baseAddress: 'b',
  bscAddress: 'n',
  solanaAddress: 's',
  cashAppCashtag: 'c',
  venmoUsername: 'v',
};
const LONG: Record<string, string> = Object.fromEntries(
  Object.entries(SHORT).map(([k, v]) => [v, k])
);

/** encode profile for /tip/... path — short keys, omit empty optionals */
export function encodeProfileForUrl(profile: UserProfile): string {
  const compact: Record<string, string> = {};
  if (profile.ethereumAddress?.trim()) compact.e = profile.ethereumAddress.trim();
  if (profile.baseAddress?.trim()) compact.b = profile.baseAddress.trim();
  if (profile.bscAddress?.trim()) compact.n = profile.bscAddress.trim();
  if (profile.solanaAddress?.trim()) compact.s = profile.solanaAddress.trim();
  if (profile.cashAppCashtag?.trim()) compact.c = profile.cashAppCashtag.trim();
  if (profile.venmoUsername?.trim()) compact.v = profile.venmoUsername.trim();
  return encodeURIComponent(JSON.stringify(compact));
}

/** decode /tip/... segment to UserProfile; supports old long-key URLs */
export function decodeProfileFromUrl(encoded: string): UserProfile {
  const raw = decodeURIComponent(encoded);
  const parsed = JSON.parse(raw) as Record<string, string>;
  const hasShortKeys = Object.keys(parsed).every((k) => LONG[k] != null);
  if (hasShortKeys && Object.keys(parsed).length > 0) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const long = LONG[k];
      if (long) out[long] = v;
    }
    return {
      ethereumAddress: out.ethereumAddress ?? '',
      baseAddress: out.baseAddress,
      bscAddress: out.bscAddress,
      solanaAddress: out.solanaAddress ?? '',
      cashAppCashtag: out.cashAppCashtag,
      venmoUsername: out.venmoUsername,
    };
  }
  return parsed as unknown as UserProfile;
}
