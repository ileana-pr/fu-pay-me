import type { AppKitNetwork } from '@reown/appkit-common';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet } from '@reown/appkit/networks';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

const metadata = {
  name: 'FU Pay Me',
  description: 'Get paid with crypto',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://fu-payme.vercel.app',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/vite.svg` : 'https://fu-payme.vercel.app/vite.svg'],
};

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet as AppKitNetwork];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

// create modal — in Reown Dashboard → Domain, allowlist your app origin for explorer wallet list
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    enableCoinbase: false,
    debug: true,
    features: {
      analytics: false,
      swaps: false,
      onramp: false,
      email: false,
      socials: [],
    },
  });
}

export const config = wagmiAdapter.wagmiConfig;
