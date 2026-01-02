import { http, createConfig } from 'wagmi';

// mainnet chains (production - real money)
// import { mainnet, polygon, base, arbitrum, optimism, avalanche, bsc, fantom, zkSync, linea, scroll, mantle, blast } from 'wagmi/chains';
// testnet chains (development - free test tokens)
import { 
  sepolia, 
  polygonAmoy, 
  baseSepolia, 
  arbitrumSepolia, 
  optimismSepolia,
  avalancheFuji,      // avalanche testnet
  bscTestnet,          // binance smart chain testnet
  fantomTestnet,       // fantom testnet
  zkSyncSepoliaTestnet, // zksync testnet
  lineaSepolia,        // linea testnet
  scrollSepolia,       // scroll testnet
  mantleSepoliaTestnet, // mantle testnet
  blastSepolia,        // blast testnet
} from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = 'demo-project-id';

// NETWORK CONFIGURATION GUIDE:
// 
// TO SWITCH BETWEEN MAINNET AND TESTNET:
// 
// 1. FOR TESTING (Development):
//    - Use testnet imports (see imports above)
//    - Switch your wallet (MetaMask) to matching testnets
//    - Get free test tokens from faucets:
//      * Ethereum Sepolia: https://sepoliafaucet.com/
//      * Polygon Amoy: https://faucet.polygon.technology/
//      * Base Sepolia: https://www.alchemy.com/faucets/base-sepolia
//      * Arbitrum Sepolia: https://www.alchemy.com/faucets/arbitrum-sepolia
//      * Optimism Sepolia: https://www.alchemy.com/faucets/optimism-sepolia
//      * Avalanche Fuji: https://faucet.avalanche.com/
//      * BSC Testnet: https://testnet.bnbchain.org/faucet-smart
//      * Fantom Testnet: https://faucet.fantom.network/
//      * zkSync Sepolia: https://portal.zksync.io/faucet
//      * Linea Sepolia: https://faucet.quicknode.com/linea/sepolia
//      * Scroll Sepolia: https://scroll.io/alpha/faucet
//      * Mantle Sepolia: https://faucet.quicknode.com/mantle/sepolia
//      * Blast Sepolia: https://blast.io/en/faucet
//
// 2. FOR PRODUCTION:
//    - Use mainnet chains: mainnet, polygon, base, arbitrum, optimism, avalanche, bsc, fantom, zkSync, linea, scroll, mantle, blast
//    - Switch wallet to mainnet networks
//    - Use real tokens (ETH, MATIC, AVAX, BNB, FTM, etc.)
//
// NOTE: Your wallet MUST be on the same network as configured here!
//       Mismatched networks will cause transactions to fail.

export const config = createConfig({
  // CURRENT: Using TESTNET (development - free test tokens)
  // FOR PRODUCTION: Replace testnets with mainnets (see commented imports above)
  chains: [
    sepolia,              // ethereum
    polygonAmoy,          // polygon
    baseSepolia,          // base
    arbitrumSepolia,      // arbitrum
    optimismSepolia,      // optimism
    avalancheFuji,        // avalanche
    bscTestnet,           // binance smart chain
    fantomTestnet,        // fantom
    zkSyncSepoliaTestnet, // zksync
    lineaSepolia,         // linea
    scrollSepolia,        // scroll
    mantleSepoliaTestnet, // mantle
    blastSepolia,        // blast
  ],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    // CURRENT: Testnet transports (free test networks)
    // FOR PRODUCTION: Replace with mainnet chain IDs
    [sepolia.id]: http(),
    // use default RPC for polygon amoy (not custom endpoint) to reduce conflicts
    // when using injected connector, wagmi should prefer MetaMask's provider anyway
    [polygonAmoy.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [avalancheFuji.id]: http(),
    [bscTestnet.id]: http(),
    [fantomTestnet.id]: http(),
    [zkSyncSepoliaTestnet.id]: http(),
    [lineaSepolia.id]: http(),
    [scrollSepolia.id]: http(),
    [mantleSepoliaTestnet.id]: http(),
    [blastSepolia.id]: http(),
  },
});
