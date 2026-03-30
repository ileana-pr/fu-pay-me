// no @taquito here — it crashes Vercel lambdas at import (FUNCTION_INVOCATION_FAILED).
// client keeps full base58check via src/lib/tezosAddress.ts (taquito).
const TEZOS_PAYMENT_ADDRESS = /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/;

export function isValidTezosAddress(s: string): boolean {
  return TEZOS_PAYMENT_ADDRESS.test(s.trim());
}
