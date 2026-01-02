import { Wallet } from 'lucide-react';

type Blockchain = 'ethereum' | 'solana' | 'bitcoin';

interface CryptoSelectorProps {
  onSelect: (blockchain: Blockchain) => void;
  onBack: () => void;
}

export default function CryptoSelector({ onSelect, onBack }: CryptoSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-8"
        >
          ← Back
        </button>

        <div className="bg-slate-800/50 backdrop-blur-lg rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
              <Wallet className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Select Blockchain</h2>
            <p className="text-gray-400">Choose which blockchain to send payment on</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['ethereum', 'solana', 'bitcoin'] as Blockchain[]).map((chain) => (
              <button
                key={chain}
                onClick={() => onSelect(chain)}
                className="py-6 px-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-700 hover:to-slate-800 rounded-xl font-semibold transition-all duration-300 hover:scale-105 border border-slate-600/50 min-h-[120px] flex flex-col items-center justify-center"
              >
                <div className="text-2xl font-bold capitalize mb-1">{chain}</div>
                <div className="text-sm text-gray-400">
                  {chain === 'bitcoin' ? 'BTC' : chain === 'ethereum' ? 'ETH & ERC20' : 'SOL & SPL'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

