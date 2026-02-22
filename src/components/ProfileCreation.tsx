import { useState, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { ArrowLeft, Plus, Save, Loader2, Trash2 } from 'lucide-react';

// public client for ENS resolution (reads only, no wallet needed)
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// simplified profile — payment addresses for receiving tips
export interface UserProfile {
  ethereumAddress: string;
  /** base payment address (or .base name); optional for backward compatibility */
  baseAddress?: string;
  /** BNB Smart Chain payment address (0x); optional, same format as EVM */
  bscAddress?: string;
  solanaAddress: string;
  /** cash app $cashtag (e.g. johndoe) — opens cash.app/$cashtag when tipper pays */
  cashAppCashtag?: string;
  /** venmo username (e.g. johndoe) — opens venmo.com/username?txn=pay when tipper pays */
  venmoUsername?: string;
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
    baseAddress: initialProfile?.baseAddress ?? '',
    bscAddress: initialProfile?.bscAddress ?? '',
    solanaAddress: initialProfile?.solanaAddress ?? '',
    cashAppCashtag: initialProfile?.cashAppCashtag ?? '',
    venmoUsername: initialProfile?.venmoUsername ?? '',
  });
  const [editingChain, setEditingChain] = useState<'ethereum' | 'base' | 'bsc' | 'solana' | 'cashapp' | 'venmo'>('ethereum');
  const [manualAddress, setManualAddress] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const getAddressForChain = (chain: 'ethereum' | 'base' | 'bsc' | 'solana' | 'cashapp' | 'venmo') =>
    chain === 'ethereum' ? profile.ethereumAddress : chain === 'base' ? profile.baseAddress : chain === 'bsc' ? profile.bscAddress : chain === 'solana' ? profile.solanaAddress : chain === 'cashapp' ? (profile.cashAppCashtag ?? '') : (profile.venmoUsername ?? '');

  const handlePickChain = (chain: 'ethereum' | 'base' | 'bsc' | 'solana' | 'cashapp' | 'venmo') => {
    setEditingChain(chain);
    setManualAddress(getAddressForChain(chain) ?? '');
    setResolvedAddress(null);
    setResolveError(null);
    setStep('manual');
  };

  const isDomainName = useCallback((input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (editingChain === 'ethereum') return trimmed.endsWith('.eth');
    // base: require resolve for .base names or .base.eth (ENS subdomain) — never save raw name strings
    if (editingChain === 'base') return trimmed.endsWith('.base') || trimmed.endsWith('.eth') || trimmed.includes('.base');
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
      } else if (domain.endsWith('.base')) {
        const name = domain.replace(/\.base$/i, '');
        const res = await fetch(`https://api.basename.app/v1/names/${encodeURIComponent(name)}`);
        if (!res.ok) throw new Error('could not resolve .base name');
        const data = await res.json();
        const addr = data?.address ?? data?.owner ?? data?.eth_address;
        if (!addr) throw new Error('no address found for this .base name');
        setResolvedAddress(addr);
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

  const isValidEvmAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);

  const handleSaveAddress = () => {
    const trimmed = manualAddress.trim();
    // cash app: store $cashtag without the $, lowercase (cashtags are case-insensitive)
    if (editingChain === 'cashapp') {
      const cashtag = trimmed.replace(/^\$/, '').toLowerCase();
      if (!cashtag) return;
      setProfile(p => ({ ...p, cashAppCashtag: cashtag }));
      setManualAddress('');
      setResolvedAddress(null);
      setResolveError(null);
      setStep('review');
      return;
    }
    // venmo: store username without @, lowercase
    if (editingChain === 'venmo') {
      const username = trimmed.replace(/^@/, '').toLowerCase();
      if (!username) return;
      setProfile(p => ({ ...p, venmoUsername: username }));
      setManualAddress('');
      setResolvedAddress(null);
      setResolveError(null);
      setStep('review');
      return;
    }
    const looksLikeDomain = trimmed.toLowerCase().endsWith('.base') || trimmed.toLowerCase().endsWith('.eth') || trimmed.toLowerCase().endsWith('.sol') || trimmed.toLowerCase().includes('.base');
    const address = looksLikeDomain ? (resolvedAddress || null) : (resolvedAddress || trimmed);
    if (!address) return;
    // base, ethereum, and bsc must store a valid 0x address (never a name string)
    if ((editingChain === 'base' || editingChain === 'ethereum' || editingChain === 'bsc') && !isValidEvmAddress(address)) {
      setResolveError(editingChain === 'bsc' ? 'Please enter a valid 0x address.' : 'Please enter a valid 0x address or resolve a .base / .eth name first.');
      return;
    }
    setResolveError(null);
    if (editingChain === 'ethereum') {
      setProfile(p => ({ ...p, ethereumAddress: address }));
    } else if (editingChain === 'base') {
      setProfile(p => ({ ...p, baseAddress: address }));
    } else if (editingChain === 'bsc') {
      setProfile(p => ({ ...p, bscAddress: address }));
    } else {
      setProfile(p => ({ ...p, solanaAddress: address }));
    }
    setManualAddress('');
    setResolvedAddress(null);
    setResolveError(null);
    setStep('review');
  };

  const handleFinalSave = () => onSave(profile);

  const removePayment = (kind: 'ethereum' | 'base' | 'bsc' | 'solana' | 'cashapp' | 'venmo') => {
    if (kind === 'ethereum') setProfile(p => ({ ...p, ethereumAddress: '' }));
    else if (kind === 'base') setProfile(p => ({ ...p, baseAddress: '' }));
    else if (kind === 'bsc') setProfile(p => ({ ...p, bscAddress: '' }));
    else if (kind === 'solana') setProfile(p => ({ ...p, solanaAddress: '' }));
    else if (kind === 'cashapp') setProfile(p => ({ ...p, cashAppCashtag: '' }));
    else setProfile(p => ({ ...p, venmoUsername: '' }));
  };

  const hasAnyAddress = profile.ethereumAddress || profile.baseAddress || profile.bscAddress || profile.solanaAddress || !!profile.cashAppCashtag?.trim() || !!profile.venmoUsername?.trim();

  // ─── step 1: pick a chain to add or edit ───
  if (step === 'chains') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">Payment methods</h1>
            <p className="text-sm text-gray-400">add crypto wallets and fiat payment apps — works with apps from any country</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePickChain('ethereum')}
              className="relative p-4 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] aspect-square min-h-0"
            >
              <Plus className="absolute top-2 right-2 w-4 h-4 text-gray-500" />
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-xl">⟠</div>
              <span className="font-semibold text-sm">Ethereum</span>
              <span className="text-xs text-gray-400 truncate w-full text-center">
                {profile.ethereumAddress ? `${profile.ethereumAddress.slice(0, 8)}...` : 'ETH or .eth'}
              </span>
            </button>

            <button
              onClick={() => handlePickChain('base')}
              className="relative p-4 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] aspect-square min-h-0"
            >
              <Plus className="absolute top-2 right-2 w-4 h-4 text-gray-500" />
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center" />
              <span className="font-semibold text-sm">Base</span>
              <span className="text-xs text-gray-400 truncate w-full text-center">
                {profile.baseAddress ? `${profile.baseAddress.slice(0, 8)}...` : 'ETH or .base'}
              </span>
            </button>

            <button
              onClick={() => handlePickChain('bsc')}
              className="relative p-4 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] aspect-square min-h-0"
            >
              <Plus className="absolute top-2 right-2 w-4 h-4 text-gray-500" />
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center text-xl font-bold text-amber-400">◆</div>
              <span className="font-semibold text-sm">BNB Chain</span>
              <span className="text-xs text-gray-400 truncate w-full text-center">
                {profile.bscAddress ? `${profile.bscAddress.slice(0, 8)}...` : '0x address'}
              </span>
            </button>

            <button
              onClick={() => handlePickChain('solana')}
              className="relative p-4 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] aspect-square min-h-0"
            >
              <Plus className="absolute top-2 right-2 w-4 h-4 text-gray-500" />
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-xl">◎</div>
              <span className="font-semibold text-sm">Solana</span>
              <span className="text-xs text-gray-400 truncate w-full text-center">
                {profile.solanaAddress ? `${profile.solanaAddress.slice(0, 8)}...` : 'SOL or .sol'}
              </span>
            </button>

            <button
              onClick={() => handlePickChain('cashapp')}
              className="relative p-4 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] aspect-square min-h-0"
            >
              <Plus className="absolute top-2 right-2 w-4 h-4 text-gray-500" />
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-lg font-bold text-emerald-400">$</div>
              <span className="font-semibold text-sm">Cash App</span>
              <span className="text-xs text-gray-400 truncate w-full text-center">
                {profile.cashAppCashtag ? `$${profile.cashAppCashtag}` : '$cashtag'}
              </span>
            </button>

            <button
              onClick={() => handlePickChain('venmo')}
              className="relative p-4 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] aspect-square min-h-0"
            >
              <Plus className="absolute top-2 right-2 w-4 h-4 text-gray-500" />
              <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center text-lg font-bold text-sky-400">V</div>
              <span className="font-semibold text-sm">Venmo</span>
              <span className="text-xs text-gray-400 truncate w-full text-center">
                {profile.venmoUsername ? `@${profile.venmoUsername}` : 'username'}
              </span>
            </button>
          </div>

          {hasAnyAddress && (
            <button
              onClick={() => setStep('review')}
              className="w-full mt-5 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold text-sm transition-colors"
            >
              Review & Save
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── step 2: manual address input (or cash app cashtag / venmo username) ───
  if (step === 'manual') {
    // cash app: single field for $cashtag, no domain resolution
    if (editingChain === 'cashapp') {
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
              <h1 className="text-3xl font-bold mb-2">Cash App $cashtag</h1>
              <p className="text-gray-400">your Cash App username (with or without $)</p>
            </div>
            <div className="space-y-6">
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="$johndoe or johndoe"
                className="w-full px-4 py-4 bg-slate-800/60 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder-gray-500 text-lg"
                autoFocus
              />
              <button
                onClick={handleSaveAddress}
                disabled={!manualAddress.trim().replace(/^\$/, '').trim()}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-semibold text-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Save $cashtag
              </button>
            </div>
          </div>
        </div>
      );
    }
    // venmo: single field for username (with or without @)
    if (editingChain === 'venmo') {
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
              <h1 className="text-3xl font-bold mb-2">Venmo username</h1>
              <p className="text-gray-400">your Venmo username (with or without @)</p>
            </div>
            <div className="space-y-6">
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="@johndoe or johndoe"
                className="w-full px-4 py-4 bg-slate-800/60 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 text-white placeholder-gray-500 text-lg"
                autoFocus
              />
              <button
                onClick={handleSaveAddress}
                disabled={!manualAddress.trim().replace(/^@/, '').trim()}
                className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl font-semibold text-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Save username
              </button>
            </div>
          </div>
        </div>
      );
    }

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
              {editingChain === 'ethereum' ? 'Ethereum' : editingChain === 'base' ? 'Base' : editingChain === 'bsc' ? 'BNB Chain' : 'Solana'} Address
            </h1>
            <p className="text-gray-400">
              paste a wallet address
              {editingChain === 'ethereum' ? ' or ENS name (e.g. vitalik.eth)' : editingChain === 'base' ? ' or .base name' : editingChain === 'bsc' ? ' (0x format)' : ' or .sol domain'}
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
              placeholder={editingChain === 'ethereum' ? '0x... or name.eth' : editingChain === 'base' ? '0x... or name.base' : editingChain === 'bsc' ? '0x...' : 'Base58 address or name.sol'}
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

            {editingChain !== 'bsc' && isDomainName(manualAddress) && !resolvedAddress ? (
              <button
                onClick={() => resolveDomain(manualAddress.trim().toLowerCase())}
                disabled={isResolving}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl font-semibold text-lg disabled:opacity-60 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {isResolving ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Resolving...</>
                ) : (
                  <>Resolve {manualAddress.trim().toLowerCase().endsWith('.eth') ? 'ENS' : manualAddress.trim().toLowerCase().endsWith('.base') ? '.base' : '.sol'} Name</>
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
          <h1 className="text-3xl font-bold mb-2">Review your profile</h1>
          <p className="text-gray-400">crypto & fiat — where you'll receive tips</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">⟠</span>
                <span className="font-semibold">Ethereum</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.ethereumAddress && (
                  <button
                    onClick={() => removePayment('ethereum')}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                <button
                  onClick={() => handlePickChain('ethereum')}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {profile.ethereumAddress ? 'Edit' : 'Add'}
                </button>
              </div>
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
                <span className="inline-block w-5 h-5 bg-blue-500 rounded-md shrink-0" />
                <span className="font-semibold">Base</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.baseAddress && (
                  <button
                    onClick={() => removePayment('base')}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                <button
                  onClick={() => handlePickChain('base')}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {profile.baseAddress ? 'Edit' : 'Add'}
                </button>
              </div>
            </div>
            {profile.baseAddress ? (
              <code className="text-indigo-400 text-sm break-all">{profile.baseAddress}</code>
            ) : (
              <button
                onClick={() => handlePickChain('base')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Base address
              </button>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-amber-400">◆</span>
                <span className="font-semibold">BNB Chain</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.bscAddress && (
                  <button
                    onClick={() => removePayment('bsc')}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                <button
                  onClick={() => handlePickChain('bsc')}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {profile.bscAddress ? 'Edit' : 'Add'}
                </button>
              </div>
            </div>
            {profile.bscAddress ? (
              <code className="text-amber-400 text-sm break-all">{profile.bscAddress}</code>
            ) : (
              <button
                onClick={() => handlePickChain('bsc')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-amber-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add BNB address
              </button>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">◎</span>
                <span className="font-semibold">Solana</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.solanaAddress && (
                  <button
                    onClick={() => removePayment('solana')}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                <button
                  onClick={() => handlePickChain('solana')}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {profile.solanaAddress ? 'Edit' : 'Add'}
                </button>
              </div>
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

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-emerald-400">$</span>
                <span className="font-semibold">Cash App</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.cashAppCashtag && (
                  <button
                    onClick={() => removePayment('cashapp')}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                <button
                  onClick={() => handlePickChain('cashapp')}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {profile.cashAppCashtag ? 'Edit' : 'Add'}
                </button>
              </div>
            </div>
            {profile.cashAppCashtag ? (
              <code className="text-emerald-400 text-sm">${profile.cashAppCashtag}</code>
            ) : (
              <button
                onClick={() => handlePickChain('cashapp')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Cash App $cashtag
              </button>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-sky-400">V</span>
                <span className="font-semibold">Venmo</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.venmoUsername && (
                  <button
                    onClick={() => removePayment('venmo')}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
                <button
                  onClick={() => handlePickChain('venmo')}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {profile.venmoUsername ? 'Edit' : 'Add'}
                </button>
              </div>
            </div>
            {profile.venmoUsername ? (
              <code className="text-sky-400 text-sm">@{profile.venmoUsername}</code>
            ) : (
              <button
                onClick={() => handlePickChain('venmo')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-sky-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Venmo username
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
