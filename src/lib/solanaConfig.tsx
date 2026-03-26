import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';

// read endpoint from env. publicnode can hit ERR_SSL_PROTOCOL_ERROR on some mobile browsers;
// official mainnet-beta or ankr are safer defaults; use Helius/QuickNode in production for scale.
const endpoint =
  import.meta.env.VITE_SOLANA_ENDPOINT || 'https://api.mainnet-beta.solana.com';

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

