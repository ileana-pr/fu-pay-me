// keep one implementation in src; api re-exports so client + server never diverge
export { isValidTezosAddress } from '../../src/lib/tezosAddress';
