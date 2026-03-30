import { validateAddress, ValidationResult } from '@taquito/utils';

/** keep in sync with api/lib/tezosAddress.ts (taquito validateAddress) */
export function isValidTezosAddress(s: string): boolean {
  return validateAddress(s.trim()) === ValidationResult.VALID;
}
