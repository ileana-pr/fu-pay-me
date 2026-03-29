import React from 'react';
import type { ConnectionConfig } from '@solana/web3.js';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { solanaBrowserFetch } from './solanaBrowserFetch';
import { getSolanaRpcEndpoint } from './solanaEndpoint';

const connectionConfig: ConnectionConfig = {
  commitment: 'confirmed',
  fetch: solanaBrowserFetch,
};

function SolanaConfigMissing() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-piri-cream text-piri">
      <div className="max-w-md rounded-2xl border-2 border-piri/20 bg-white p-8 shadow-lg">
        <h1 className="piri-heading text-xl font-black mb-3">configuration: solana rpc</h1>
        <p className="text-sm text-piri-muted mb-3">
          this build does not include <code className="font-mono text-piri">VITE_SOLANA_ENDPOINT</code>. vite
          bakes it in at <strong>build</strong> time, so add the variable in vercel (production and any preview
          envs you use), then <strong>redeploy</strong>.
        </p>
        <p className="text-xs text-piri-muted">
          local: set the same name in <code className="font-mono">.env.local</code> and restart{' '}
          <code className="font-mono">npm run dev</code>.
        </p>
      </div>
    </div>
  );
}

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const wallets: never[] = [];
  const endpoint = getSolanaRpcEndpoint();

  if (!endpoint) {
    return <SolanaConfigMissing />;
  }

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
