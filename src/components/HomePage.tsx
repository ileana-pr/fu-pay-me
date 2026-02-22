import { QrCode, Plus, Wallet } from 'lucide-react';

interface HomePageProps {
  onCreateProfile: () => void;
  onViewProfile: () => void;
  hasProfile: boolean;
}

export default function HomePage({ onCreateProfile, onViewProfile, hasProfile }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-6">
            <Wallet className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            FU Pay Me
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            one QR code. instant crypto payments.
          </p>
          <p className="text-gray-500">
            add your ETH & SOL addresses, share a QR code, get paid
          </p>
        </div>

        <div className="space-y-4 max-w-sm mx-auto">
          {hasProfile ? (
            <>
              <button
                onClick={onViewProfile}
                className="w-full p-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center gap-3 font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                <QrCode className="w-6 h-6" />
                View My QR Code
              </button>
              <button
                onClick={onCreateProfile}
                className="w-full p-4 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center justify-center gap-2 text-gray-300 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Edit Wallets
              </button>
            </>
          ) : (
            <button
              onClick={onCreateProfile}
              className="w-full p-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center gap-3 font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-6 h-6" />
              Get Started
            </button>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-500">
            Made with <span className="text-blue-500">💙</span> for{' '}
            <a
              href="https://x.com/homebasedotlove"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Home Base
            </a>
            {' · ETH Denver 2026 · '}
            <a
              href="https://x.com/adigitaltati"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              @adigitaltati
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
