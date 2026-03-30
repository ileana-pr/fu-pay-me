import { validateAddress, ValidationResult } from '@taquito/utils';

// mirror src/lib/tezosAddress.ts — do not import from src/ (vercel api bundle can break on ../../src)
export function isValidTezosAddress(s: string): boolean {
  return validateAddress(s.trim()) === ValidationResult.VALID;
}
