/** light client-only shape checks — catches obvious typos, not on-chain existence */

export function isValidEvmAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

export function isValidBitcoinAddress(s: string): boolean {
  const t = s.trim();
  return /^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$|^bc1[a-z0-9]{39,89}$/i.test(t);
}

export function isValidTezosAddress(s: string): boolean {
  return /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(s.trim());
}

/** base58 pubkey string length band — typical ed25519 pubkeys are 43–44 chars */
export function isValidSolanaAddress(s: string): boolean {
  const t = s.trim();
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t);
}
