import type { AppKitNetwork } from '@reown/appkit-common';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet } from '@reown/appkit/networks';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

const metadata = {
  name: 'FU Pay Me',
  description: 'Get paid with crypto',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://fu-pay-me.vercel.app',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/vite.svg` : 'https://fu-pay-me.vercel.app/vite.svg'],
};

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet as AppKitNetwork];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

// create modal — hide "search wallet" (blank on mobile), show featured only
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    enableCoinbase: false,
    allWallets: 'HIDE',
    featuredWalletIds: [
      '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // MetaMask
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
      '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f082fb9a3c8e5f1e4', // Rainbow
    ],
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
