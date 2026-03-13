import { createConfig } from '@privy-io/wagmi';
import { mainnet, base } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = createConfig({
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});
