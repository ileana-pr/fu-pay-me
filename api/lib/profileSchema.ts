// profile schema for api — matches frontend UserProfile
export interface StoredProfile {
  ethereumAddress?: string;
  baseAddress?: string;
  bitcoinAddress?: string;
  solanaAddress?: string;
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
    'cashAppCashtag',
    'venmoUsername',
    'zelleContact',
    'paypalUsername',
  ];
  for (const key of Object.keys(p)) {
    if (!allowed.includes(key) || typeof p[key] !== 'string') return false;
  }
  return hasAtLeastOneMethod(p as StoredProfile);
}
