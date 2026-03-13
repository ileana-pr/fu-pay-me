import { useConnectModal } from '@rainbow-me/rainbowkit';
import { usePrivy } from '@privy-io/react-auth';
import { Wallet, Smartphone } from 'lucide-react';

interface ConnectChoiceContentProps {
  usePrivyLogin: boolean;
  onPrivyLogin?: () => void;
  onWalletConnect: () => void;
  isConnecting?: boolean;
  /** compact = two buttons for tip flow; full = page layout for login */
  variant: 'compact' | 'full';
}

// shared ui — receives handlers so we can avoid usePrivy when not configured
function ConnectChoiceContent({
  usePrivyLogin,
  onPrivyLogin,
  onWalletConnect,
  isConnecting = false,
  variant,
}: ConnectChoiceContentProps) {
  const buttons = (
    <div className="space-y-4">
      {/* Privy — email, social, or embedded wallet */}
      <button
        type="button"
        onClick={usePrivyLogin ? onPrivyLogin : undefined}
        disabled={!usePrivyLogin}
        className={`w-full p-5 rounded-xl border-2 flex items-center gap-4 transition-colors ${
          usePrivyLogin
            ? 'border-piri bg-piri/10 hover:bg-piri/20 cursor-pointer'
            : 'border-piri/20 bg-piri-cream/50 opacity-60 cursor-not-allowed'
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-piri/10 flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6 text-piri" />
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-piri">Sign in with Privy</p>
          <p className="text-xs piri-muted">
            {usePrivyLogin ? 'email, social, or create wallet' : 'add VITE_PRIVY_APP_ID to enable'}
          </p>
        </div>
      </button>

      {/* Connect wallet — MetaMask, Coinbase, etc. */}
      <button
        type="button"
        onClick={onWalletConnect}
        disabled={isConnecting}
        className="w-full p-5 rounded-xl border-2 border-piri-cashapp bg-piri-cashapp/10 hover:bg-piri-cashapp/20 flex items-center gap-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-12 h-12 rounded-xl bg-piri-cashapp/20 flex items-center justify-center shrink-0">
          <Smartphone className="w-6 h-6 text-piri-cashapp" />
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-piri">Connect wallet</p>
          <p className="text-xs piri-muted">
            {isConnecting ? 'Connecting...' : 'MetaMask, Phantom, WalletConnect'}
          </p>
        </div>
      </button>
    </div>
  );

  if (variant === 'compact') {
    return buttons;
  }

  return (
    <div className="piri-page">
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="piri-heading text-4xl font-black mb-3">Sign in to Piri</h1>
          <p className="text-sm piri-muted font-semibold">connect a wallet to create your tip link</p>
        </div>
        {buttons}
        <p className="mt-8 text-center text-xs piri-muted">
          you need a wallet to receive tips — we never custody your funds
        </p>
      </div>
    </div>
  );
}

// only rendered when PrivyProvider is present — safe to call usePrivy
function ConnectChoiceWithPrivy({
  variant,
  isConnecting,
}: {
  variant: 'compact' | 'full';
  isConnecting?: boolean;
}) {
  const { login } = usePrivy();
  const { openConnectModal: open } = useConnectModal();
  const onWalletConnect = open ?? (() => {});
  return (
    <ConnectChoiceContent
      usePrivyLogin={true}
      onPrivyLogin={login}
      onWalletConnect={onWalletConnect}
      isConnecting={isConnecting}
      variant={variant}
    />
  );
}

// when Privy not configured — no usePrivy, only RainbowKit
function ConnectChoiceNoPrivy({
  variant,
  isConnecting,
}: {
  variant: 'compact' | 'full';
  isConnecting?: boolean;
}) {
  const { openConnectModal: open } = useConnectModal();
  const onWalletConnect = open ?? (() => {});
  return (
    <ConnectChoiceContent
      usePrivyLogin={false}
      onWalletConnect={onWalletConnect}
      isConnecting={isConnecting}
      variant={variant}
    />
  );
}

interface ConnectChoiceProps {
  hasPrivy: boolean;
  variant?: 'compact' | 'full';
  isConnecting?: boolean;
}

export default function ConnectChoice({ hasPrivy, variant = 'compact', isConnecting }: ConnectChoiceProps) {
  return hasPrivy ? (
    <ConnectChoiceWithPrivy variant={variant} isConnecting={isConnecting} />
  ) : (
    <ConnectChoiceNoPrivy variant={variant} isConnecting={isConnecting} />
  );
}
