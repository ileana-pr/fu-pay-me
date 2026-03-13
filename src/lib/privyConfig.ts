import type { PrivyClientConfig } from '@privy-io/react-auth';
import { mainnet, base } from 'viem/chains';

export const privyConfig: PrivyClientConfig = {
  loginMethods: ['email', 'wallet', 'google', 'apple'],
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
  },
  appearance: {
    showWalletLoginFirst: false,
  },
  supportedChains: [mainnet, base],
};
