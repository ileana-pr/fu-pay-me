/// <reference types="vite/client" />

// Buffer polyfill for Solana libraries; ethereum = wallet injector (MetaMask etc.)
interface Window {
  Buffer: typeof Buffer;
  ethereum?: import('viem').EIP1193Provider;
}

interface ImportMetaEnv {
  readonly VITE_BTC_ADDRESS: string;
  readonly VITE_ETH_ADDRESS: string;
  readonly VITE_SOL_ADDRESS: string;
  readonly VITE_SOLANA_ENDPOINT?: string;
  /** public tezos mainnet rpc (https), e.g. https://mainnet.ecadinfra.com */
  readonly VITE_TEZOS_RPC_URL?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_CASHAPP_HANDLE: string;
  readonly VITE_VENMO_HANDLE: string;
  readonly VITE_ZELLE_HANDLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
