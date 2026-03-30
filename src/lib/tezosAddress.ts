import { validateAddress, ValidationResult } from '@taquito/utils';

/** same rule as server — base58check + prefix (tz1/tz2/tz3, KT1, …) via taquito */
export function isValidTezosAddress(s: string): boolean {
  return validateAddress(s.trim()) === ValidationResult.VALID;
}
