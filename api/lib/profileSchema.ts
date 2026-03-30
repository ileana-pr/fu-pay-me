// profile schema for api — matches frontend UserProfile
import { isValidTezosAddress } from './tezosAddress';

export interface StoredProfile {
  ethereumAddress?: string;
  baseAddress?: string;
  bitcoinAddress?: string;
  solanaAddress?: string;
  tezosAddress?: string;
  cashAppCashtag?: string;
  venmoUsername?: string;
  zelleContact?: string;
  paypalUsername?: string;
}

function hasAtLeastOneMethod(p: StoredProfile): boolean {
  const vals = [
    p.ethereumAddress,
    p.baseAddress,
    p.bitcoinAddress,
    p.solanaAddress,
    p.tezosAddress,
    p.cashAppCashtag,
    p.venmoUsername,
    p.zelleContact,
    p.paypalUsername,
  ];
  return vals.some((v) => typeof v === 'string' && v.trim().length > 0);
}

export function validateProfile(body: unknown): body is StoredProfile {
  if (!body || typeof body !== 'object') return false;
  const p = body as Record<string, unknown>;
  const allowed = [
    'ethereumAddress',
    'baseAddress',
    'bitcoinAddress',
    'solanaAddress',
    'tezosAddress',
    'cashAppCashtag',
    'venmoUsername',
    'zelleContact',
    'paypalUsername',
  ];
  for (const key of Object.keys(p)) {
    if (!allowed.includes(key) || typeof p[key] !== 'string') return false;
  }
  if (
    typeof p.tezosAddress === 'string' &&
    p.tezosAddress.trim().length > 0 &&
    !isValidTezosAddress(p.tezosAddress)
  ) {
    return false;
  }
  return hasAtLeastOneMethod(p as StoredProfile);
}
