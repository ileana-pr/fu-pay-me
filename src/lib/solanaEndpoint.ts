/** helius etc.; vite inlines at build time — must be set in vercel for production builds */
export function getSolanaRpcEndpoint(): string | undefined {
  const url = import.meta.env.VITE_SOLANA_ENDPOINT?.trim();
  return url || undefined;
}
