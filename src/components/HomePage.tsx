import { QrCode, Plus } from 'lucide-react';

interface HomePageProps {
  onCreateProfile: () => void;
  onViewProfile: () => void;
  hasProfile: boolean;
}

// logo: Piri character at public/logo/piri.png (home hero)
const LOGO_SRC = '/logo/piri.png';

export default function HomePage({ onCreateProfile, onViewProfile, hasProfile }: HomePageProps) {
  return (
    <div className="piri-page">
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-piri-cashapp bg-piri-cream shadow-lg">
              <img
                src={LOGO_SRC}
                alt="Piri"
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const next = (e.target as HTMLImageElement).nextElementSibling;
                  if (next) (next as HTMLElement).classList.remove('hidden');
                }}
              />
              {/* placeholder only when image fails: "P" for Piri, not emoji */}
              <span className="hidden piri-heading text-4xl font-black text-piri-cashapp" aria-hidden>P</span>
            </div>
          </div>
          <h1 className="piri-heading text-5xl font-black mb-3">Piri</h1>
          <p className="text-xl font-bold mb-1 text-piri">Pick your flavor. Get your money.</p>
          <p className="text-sm piri-muted">one scan, every way to pay · la piragua del pueblo</p>
        </div>

        <div className="space-y-4 max-w-sm mx-auto">
          {hasProfile ? (
            <>
              <button onClick={onViewProfile} className="w-full p-6 flex items-center justify-center gap-3 text-lg piri-btn-primary">
                <QrCode className="w-6 h-6" />
                View My QR Code
              </button>
              <button onClick={onCreateProfile} className="w-full p-4 flex items-center justify-center gap-2 piri-btn-secondary">
                <Plus className="w-5 h-5" />
                Edit payment methods
              </button>
            </>
          ) : (
            <button onClick={onCreateProfile} className="w-full p-6 flex items-center justify-center gap-3 text-lg piri-btn-primary">
              <Plus className="w-6 h-6" />
              Get Started
            </button>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs piri-muted">
            Made with <span aria-label="love">🍧</span> for{' '}
            <a href="https://x.com/homebasedotlove" target="_blank" rel="noopener noreferrer" className="piri-link">Home Base</a>
            {' · ETH Denver 2026 · '}
            <a href="https://x.com/adigitaltati" target="_blank" rel="noopener noreferrer" className="piri-link">@adigitaltati</a>
          </p>
        </div>
      </div>
    </div>
  );
}
