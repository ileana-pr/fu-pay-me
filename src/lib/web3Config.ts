import type { AppKitNetwork } from '@reown/appkit-common';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet } from '@reown/appkit/networks';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// log origin so you can confirm it matches Reown allowlist (must be exactly fu-pay-me.vercel.app)
if (typeof window !== 'undefined') {
  console.log('[Reown] App origin (add this to Reown Dashboard → Domain):', window.location.origin);
}

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

// custom wallets shown when api.web3modal.com returns 403 (e.g. mobile, unverified domain)
const customWallets = [
  {
    id: 'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    name: 'MetaMask',
    homepage: 'https://metamask.io',
    image_url: `https://explorer-api.walletconnect.com/v3/logo/md/eebe4a7f-7166-402f-92e0-1f64ca2aa800?projectId=${projectId}`,
    mobile_link: 'https://metamask.app.link',
    webapp_link: 'https://metamask.io',
    app_store: 'https://apps.apple.com/us/app/metamask/id1438144202',
    play_store: 'https://play.google.com/store/apps/details?id=io.metamask',
  },
  {
    id: '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    name: 'Trust Wallet',
    homepage: 'https://trustwallet.com',
    image_url: `https://explorer-api.walletconnect.com/v3/logo/md/7677b54f-3486-46e2-4e37-bf8747814f00?projectId=${projectId}`,
    mobile_link: 'https://link.trustwallet.com',
    webapp_link: 'https://wallet.trustwallet.com',
    app_store: 'https://apps.apple.com/app/apple-store/id1288339409',
    play_store: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
  },
  {
    id: '9716482a7c7d419b8a8f5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
    name: 'Uniswap Wallet',
    homepage: 'https://wallet.uniswap.org',
    image_url: 'https://wallet.uniswap.org/favicon.ico',
    mobile_link: 'https://wallet.uniswap.org',
    webapp_link: 'https://wallet.uniswap.org',
    app_store: 'https://apps.apple.com/us/app/uniswap-wallet/id6443944476',
    play_store: 'https://play.google.com/store/apps/details?id=com.uniswap.mobile',
  },
];

// create modal — in Reown Dashboard → Domain, allowlist exactly: https://fu-pay-me.vercel.app and/or fu-pay-me.vercel.app (hyphen in "pay-me")
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    enableCoinbase: false,
    customWallets,
    debug: true, // remove after testing: shows console errors (e.g. APKT002 = origin not allowlisted)
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
