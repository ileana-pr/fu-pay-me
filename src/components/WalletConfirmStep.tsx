import { useAccount } from 'wagmi';
import { base } from 'wagmi/chains';
import ChainLogo from './ChainLogo';

interface WalletConfirmStepProps {
  onYes: () => void;
  onNo: () => void;
}

export default function WalletConfirmStep({ onYes, onNo }: WalletConfirmStepProps) {
  const { address, chain } = useAccount();

  const chainLabel = chain?.id === base.id ? 'Base' : chain?.name ?? 'Ethereum';
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div className="piri-page">
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border-2 border-piri-base bg-piri-base/20 mb-4">
            <ChainLogo chain="base" size={40} />
          </div>
          <h1 className="piri-heading text-2xl font-black mb-2">Use this wallet to receive tips?</h1>
          <p className="text-sm piri-muted font-semibold mb-4">
            Is this the <strong>{chainLabel}</strong> wallet you want to use to receive coins?
          </p>
          <p className="font-mono text-sm bg-piri-cream px-4 py-2 rounded-lg inline-block">{shortAddress}</p>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={onYes} className="w-full py-4 rounded-xl font-bold piri-btn-primary">
            Yes, use this wallet
          </button>
          <button onClick={onNo} className="w-full py-4 rounded-xl font-semibold piri-btn-secondary">
            No, I&apos;ll add a different one
          </button>
        </div>
      </div>
    </div>
  );
}
