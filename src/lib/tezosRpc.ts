/** mainnet rpc — e.g. https://mainnet.ecadinfra.com or helius tezos if you add one */
export function getTezosRpcUrl(): string | undefined {
  const raw = import.meta.env.VITE_TEZOS_RPC_URL;
  if (raw == null || typeof raw !== 'string' || raw === '') return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
  } catch {
    return undefined;
  }
  return raw;
}
