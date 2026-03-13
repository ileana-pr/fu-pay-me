import type { UserProfile } from '../components/ProfileCreation';

// short keys for url — keeps shared links readable in chat (no backend)
const SHORT: Record<string, string> = {
  ethereumAddress: 'e',
  baseAddress: 'b',
  bitcoinAddress: 'btc',
  solanaAddress: 's',
  cashAppCashtag: 'c',
  venmoUsername: 'v',
  zelleContact: 'z',
  paypalUsername: 'p',
};
const LONG: Record<string, string> = Object.fromEntries(
  Object.entries(SHORT).map(([k, v]) => [v, k])
);

/** encode profile for /tip/... path — short keys, omit empty optionals */
export function encodeProfileForUrl(profile: UserProfile): string {
  const compact: Record<string, string> = {};
  if (profile.ethereumAddress?.trim()) compact.e = profile.ethereumAddress.trim();
  if (profile.baseAddress?.trim()) compact.b = profile.baseAddress.trim();
  if (profile.bitcoinAddress?.trim()) compact.btc = profile.bitcoinAddress.trim();
  if (profile.solanaAddress?.trim()) compact.s = profile.solanaAddress.trim();
  if (profile.cashAppCashtag?.trim()) compact.c = profile.cashAppCashtag.trim();
  if (profile.venmoUsername?.trim()) compact.v = profile.venmoUsername.trim();
  if (profile.zelleContact?.trim()) compact.z = profile.zelleContact.trim();
  if (profile.paypalUsername?.trim()) compact.p = profile.paypalUsername.trim();
  return encodeURIComponent(JSON.stringify(compact));
}

/** segment looks like stable id (nanoid) vs encoded JSON */
export function isProfileId(segment: string): boolean {
  return segment.length >= 8 && segment.length <= 32 && /^[a-zA-Z0-9_-]+$/.test(segment) && !segment.startsWith('%');
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
      bitcoinAddress: out.bitcoinAddress,
      solanaAddress: out.solanaAddress ?? '',
      cashAppCashtag: out.cashAppCashtag,
      venmoUsername: out.venmoUsername,
      zelleContact: out.zelleContact,
      paypalUsername: out.paypalUsername,
    };
  }
  return parsed as unknown as UserProfile;
}
