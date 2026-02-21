import { useState, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { ArrowLeft, Plus, Save, Loader2 } from 'lucide-react';

// public client for ENS resolution (reads only, no wallet needed)
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// simplified profile — only eth and sol (payment addresses for receiving tips)
export interface UserProfile {
  ethereumAddress: string;
  solanaAddress: string;
}

interface ProfileCreationProps {
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
  initialProfile?: UserProfile | null;
}

type Step = 'chains' | 'manual' | 'review';

export default function ProfileCreation({ onSave, onBack, initialProfile }: ProfileCreationProps) {
  const [step, setStep] = useState<Step>('chains');
  const [profile, setProfile] = useState<UserProfile>({
    ethereumAddress: initialProfile?.ethereumAddress ?? '',
    solanaAddress: initialProfile?.solanaAddress ?? '',
  });
  const [editingChain, setEditingChain] = useState<'ethereum' | 'solana'>('ethereum');
  const [manualAddress, setManualAddress] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // user picks a chain for manual address entry
  const handlePickChain = (chain: 'ethereum' | 'solana') => {
    setEditingChain(chain);
    setManualAddress(chain === 'ethereum' ? profile.ethereumAddress : profile.solanaAddress);
    setResolvedAddress(null);
    setResolveError(null);
    setStep('manual');
  };

  const isDomainName = useCallback((input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (editingChain === 'ethereum') return trimmed.endsWith('.eth');
    if (editingChain === 'solana') return trimmed.endsWith('.sol');
    return false;
  }, [editingChain]);

  const resolveDomain = useCallback(async (domain: string) => {
    setIsResolving(true);
    setResolvedAddress(null);
    setResolveError(null);

    try {
      if (domain.endsWith('.eth')) {
        const address = await ensClient.getEnsAddress({ name: normalize(domain) });
        if (!address) throw new Error('no address found for this ENS name');
        setResolvedAddress(address);
      } else if (domain.endsWith('.sol')) {
        const res = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${domain.replace('.sol', '')}`);
        if (!res.ok) throw new Error('could not resolve .sol domain');
        const data = await res.json();
        if (!data.result) throw new Error('no address found for this .sol domain');
        setResolvedAddress(data.result);
      }
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : 'failed to resolve domain');
    } finally {
      setIsResolving(false);
    }
  }, []);

  const handleSaveAddress = () => {
    const address = resolvedAddress || manualAddress.trim();
    if (!address) return;
    if (editingChain === 'ethereum') {
      setProfile(p => ({ ...p, ethereumAddress: address }));
    } else {
      setProfile(p => ({ ...p, solanaAddress: address }));
    }
    setManualAddress('');
    setResolvedAddress(null);
    setResolveError(null);
    setStep('review');
  };

  const handleFinalSave = () => onSave(profile);

  const hasAnyAddress = profile.ethereumAddress || profile.solanaAddress;

  // ─── step 1: pick a chain to add or edit ───
  if (step === 'chains') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">Payment Addresses</h1>
            <p className="text-gray-400">enter wallet addresses where you want to receive tips</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handlePickChain('ethereum')}
              className="w-full p-6 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center justify-between transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center text-3xl">⟠</div>
                <div className="text-left">
                  <div className="font-semibold text-xl">Ethereum</div>
                  <div className="text-sm text-gray-400">
                    {profile.ethereumAddress ? `${profile.ethereumAddress.slice(0, 10)}...` : 'ETH address or .eth'}
                  </div>
                </div>
              </div>
              <Plus className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => handlePickChain('solana')}
              className="w-full p-6 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center justify-between transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center text-3xl">◎</div>
                <div className="text-left">
                  <div className="font-semibold text-xl">Solana</div>
                  <div className="text-sm text-gray-400">
                    {profile.solanaAddress ? `${profile.solanaAddress.slice(0, 10)}...` : 'SOL address or .sol'}
                  </div>
                </div>
              </div>
              <Plus className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {hasAnyAddress && (
            <button
              onClick={() => setStep('review')}
              className="w-full mt-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-colors"
            >
              Review & Save
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── step 2: manual address input ───
  if (step === 'manual') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button
            onClick={() => setStep('chains')}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">
              {editingChain === 'ethereum' ? 'Ethereum' : 'Solana'} Address
            </h1>
            <p className="text-gray-400">
              paste a wallet address{editingChain === 'ethereum' ? ' or ENS name (e.g. vitalik.eth)' : ' or .sol domain'}
            </p>
          </div>

          <div className="space-y-6">
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => {
                setManualAddress(e.target.value);
                setResolvedAddress(null);
                setResolveError(null);
              }}
              placeholder={editingChain === 'ethereum' ? '0x... or name.eth' : 'Base58 address or name.sol'}
              className="w-full px-4 py-4 bg-slate-800/60 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-gray-500 text-lg"
              autoFocus
            />

            {resolvedAddress && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="text-xs text-green-400 mb-1">Resolved address</div>
                <code className="text-sm text-green-300 break-all">{resolvedAddress}</code>
              </div>
            )}

            {resolveError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm text-red-400">{resolveError}</p>
              </div>
            )}

            {isDomainName(manualAddress) && !resolvedAddress ? (
              <button
                onClick={() => resolveDomain(manualAddress.trim().toLowerCase())}
                disabled={isResolving}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl font-semibold text-lg disabled:opacity-60 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {isResolving ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Resolving...</>
                ) : (
                  <>Resolve {manualAddress.trim().toLowerCase().endsWith('.eth') ? 'ENS' : '.sol'} Name</>
                )}
              </button>
            ) : (
              <button
                onClick={handleSaveAddress}
                disabled={!manualAddress.trim() && !resolvedAddress}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Save Address
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── step 3: review & save ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Review Your Profile</h1>
          <p className="text-gray-400">payment addresses where you'll receive tips</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">⟠</span>
                <span className="font-semibold">Ethereum</span>
              </div>
              <button
                onClick={() => handlePickChain('ethereum')}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                {profile.ethereumAddress ? 'Edit' : 'Add'}
              </button>
            </div>
            {profile.ethereumAddress ? (
              <code className="text-cyan-400 text-sm break-all">{profile.ethereumAddress}</code>
            ) : (
              <button
                onClick={() => handlePickChain('ethereum')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-cyan-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add ETH address
              </button>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">◎</span>
                <span className="font-semibold">Solana</span>
              </div>
              <button
                onClick={() => handlePickChain('solana')}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                {profile.solanaAddress ? 'Edit' : 'Add'}
              </button>
            </div>
            {profile.solanaAddress ? (
              <code className="text-purple-400 text-sm break-all">{profile.solanaAddress}</code>
            ) : (
              <button
                onClick={() => handlePickChain('solana')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-purple-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add SOL address
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleFinalSave}
          disabled={!hasAnyAddress}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Save className="w-5 h-5" /> Save & Generate QR Code
        </button>

        {!hasAnyAddress && (
          <p className="text-center text-sm text-gray-500 mt-4">add at least one address to continue</p>
        )}
      </div>
    </div>
  );
}
