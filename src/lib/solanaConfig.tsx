import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';

// read endpoint from env; public Solana RPC often returns 403, so we use a free provider
// set VITE_SOLANA_ENDPOINT in .env to override (e.g. Helius/QuickNode for production)
const endpoint = import.meta.env.VITE_SOLANA_ENDPOINT || 'https://solana-rpc.publicnode.com';

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  // empty array: WalletProvider auto-detects Standard Wallet compatible wallets
  // (Phantom, Backpack, Glow, etc.). 
  const wallets: never[] = [];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

