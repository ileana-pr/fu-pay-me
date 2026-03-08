import { useState, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { ArrowLeft, Plus, Save, Loader2, Trash2 } from 'lucide-react';
import ChainLogo from './ChainLogo';

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
  /** Bitcoin payment address (legacy 1..., P2SH 3..., or bech32 bc1...); optional */
  bitcoinAddress?: string;
  solanaAddress: string;
  /** cash app $cashtag (e.g. johndoe) — opens cash.app/$cashtag when tipper pays */
  cashAppCashtag?: string;
  /** venmo username (e.g. johndoe) — opens venmo.com/username?txn=pay when tipper pays */
  venmoUsername?: string;
  /** zelle email or phone — tipper copies and sends via bank app (no zelle deep link) */
  zelleContact?: string;
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
    bitcoinAddress: initialProfile?.bitcoinAddress ?? '',
    solanaAddress: initialProfile?.solanaAddress ?? '',
    cashAppCashtag: initialProfile?.cashAppCashtag ?? '',
    venmoUsername: initialProfile?.venmoUsername ?? '',
    zelleContact: initialProfile?.zelleContact ?? '',
  });
  const [editingChain, setEditingChain] = useState<'ethereum' | 'base' | 'bitcoin' | 'solana' | 'cashapp' | 'venmo' | 'zelle'>('ethereum');
  const [manualAddress, setManualAddress] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const getAddressForChain = (chain: 'ethereum' | 'base' | 'bitcoin' | 'solana' | 'cashapp' | 'venmo' | 'zelle') =>
    chain === 'ethereum' ? profile.ethereumAddress : chain === 'base' ? profile.baseAddress : chain === 'bitcoin' ? profile.bitcoinAddress : chain === 'solana' ? profile.solanaAddress : chain === 'cashapp' ? (profile.cashAppCashtag ?? '') : chain === 'venmo' ? (profile.venmoUsername ?? '') : (profile.zelleContact ?? '');

  const handlePickChain = (chain: 'ethereum' | 'base' | 'bitcoin' | 'solana' | 'cashapp' | 'venmo' | 'zelle') => {
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
      // .base and .base.eth: use proxy (avoids CORS — api.basename.app blocks direct browser requests)
      if (domain.endsWith('.base.eth') || domain.endsWith('.base') || domain.includes('.base')) {
        const name = domain.replace(/\.base\.eth$/i, '').replace(/\.base$/i, '').trim();
        if (!name) throw new Error('invalid .base name');
        const res = await fetch(`/api/basename/${encodeURIComponent(name)}`);
        if (!res.ok) throw new Error('could not resolve .base name');
        const data = await res.json();
        const addr = data?.address ?? data?.owner ?? data?.eth_address;
        if (!addr) throw new Error('no address found for this .base name');
        setResolvedAddress(addr);
      } else if (domain.endsWith('.eth')) {
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

  const isValidEvmAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);
  const isValidBitcoinAddress = (s: string) => /^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$|^bc1[a-z0-9]{39,89}$/i.test(s.trim());

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
    // zelle: store email or phone as-is (trimmed)
    if (editingChain === 'zelle') {
      if (!trimmed) return;
      setProfile(p => ({ ...p, zelleContact: trimmed }));
      setManualAddress('');
      setResolvedAddress(null);
      setResolveError(null);
      setStep('review');
      return;
    }
    const looksLikeDomain = trimmed.toLowerCase().endsWith('.base') || trimmed.toLowerCase().endsWith('.eth') || trimmed.toLowerCase().endsWith('.sol') || trimmed.toLowerCase().includes('.base');
    const address = looksLikeDomain ? (resolvedAddress || null) : (resolvedAddress || trimmed);
    if (!address) return;
    // base and ethereum must store a valid 0x address (never a name string)
    if ((editingChain === 'base' || editingChain === 'ethereum') && !isValidEvmAddress(address)) {
      setResolveError('Please enter a valid 0x address or resolve a .base / .eth name first.');
      return;
    }
    if (editingChain === 'bitcoin' && !isValidBitcoinAddress(address)) {
      setResolveError('Please enter a valid Bitcoin address (1..., 3..., or bc1...).');
      return;
    }
    setResolveError(null);
    if (editingChain === 'ethereum') {
      setProfile(p => ({ ...p, ethereumAddress: address }));
    } else if (editingChain === 'base') {
      setProfile(p => ({ ...p, baseAddress: address }));
    } else if (editingChain === 'bitcoin') {
      setProfile(p => ({ ...p, bitcoinAddress: address }));
    } else {
      setProfile(p => ({ ...p, solanaAddress: address }));
    }
    setManualAddress('');
    setResolvedAddress(null);
    setResolveError(null);
    setStep('review');
  };

  const handleFinalSave = () => onSave(profile);

  const removePayment = (kind: 'ethereum' | 'base' | 'bitcoin' | 'solana' | 'cashapp' | 'venmo' | 'zelle') => {
    if (kind === 'ethereum') setProfile(p => ({ ...p, ethereumAddress: '' }));
    else if (kind === 'base') setProfile(p => ({ ...p, baseAddress: '' }));
    else if (kind === 'bitcoin') setProfile(p => ({ ...p, bitcoinAddress: '' }));
    else if (kind === 'solana') setProfile(p => ({ ...p, solanaAddress: '' }));
    else if (kind === 'cashapp') setProfile(p => ({ ...p, cashAppCashtag: '' }));
    else if (kind === 'venmo') setProfile(p => ({ ...p, venmoUsername: '' }));
    else setProfile(p => ({ ...p, zelleContact: '' }));
  };

  const hasAnyAddress = profile.ethereumAddress || profile.baseAddress || profile.bitcoinAddress || profile.solanaAddress || !!profile.cashAppCashtag?.trim() || !!profile.venmoUsername?.trim() || !!profile.zelleContact?.trim();

  // flavor styling per method (no flavor names in UI)
  const flavorCard = (ch: typeof editingChain) =>
    ch === 'ethereum' ? 'piri-card-ethereum' : ch === 'base' ? 'piri-card-base' : ch === 'bitcoin' ? 'piri-card-bitcoin' : ch === 'solana' ? 'piri-card-solana' : ch === 'cashapp' ? 'piri-card-cashapp' : ch === 'venmo' ? 'piri-card-venmo' : 'piri-card-zelle';
  const flavorLogoBox = (ch: typeof editingChain) =>
    ch === 'ethereum' ? 'border-piri-ethereum bg-piri-ethereum/20' : ch === 'base' ? 'border-piri-base bg-piri-base/20' : ch === 'bitcoin' ? 'border-piri-bitcoin bg-piri-bitcoin/20' : ch === 'solana' ? 'border-piri-solana bg-piri-solana/20' : ch === 'cashapp' ? 'border-piri-cashapp bg-piri-cashapp/20' : ch === 'venmo' ? 'border-piri-venmo bg-piri-venmo/20' : 'border-piri-zelle bg-piri-zelle/20';

  // ─── step 1: pick a chain to add or edit ───
  if (step === 'chains') {
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-6">
          <button onClick={onBack} className="mb-4 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center mb-6">
            <h1 className="piri-heading text-2xl font-black mb-1">Your flavors</h1>
            <p className="text-sm piri-muted font-semibold">add crypto wallets and fiat apps — Piri supports them all</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['ethereum', 'base', 'bitcoin', 'solana', 'cashapp', 'venmo', 'zelle'] as const).map((chain) => {
              const label = chain === 'ethereum' ? 'Ethereum' : chain === 'base' ? 'Base' : chain === 'bitcoin' ? 'Bitcoin' : chain === 'solana' ? 'Solana' : chain === 'cashapp' ? 'Cash App' : chain === 'venmo' ? 'Venmo' : 'Zelle';
              const hint = chain === 'ethereum' ? (profile.ethereumAddress ? `${profile.ethereumAddress.slice(0, 8)}...` : 'ETH or .eth')
                : chain === 'base' ? (profile.baseAddress ? `${profile.baseAddress.slice(0, 8)}...` : 'ETH or .base')
                : chain === 'bitcoin' ? (profile.bitcoinAddress ? `${profile.bitcoinAddress.slice(0, 8)}...` : '1... or bc1...')
                : chain === 'solana' ? (profile.solanaAddress ? `${profile.solanaAddress.slice(0, 8)}...` : 'SOL or .sol')
                : chain === 'cashapp' ? (profile.cashAppCashtag ? `$${profile.cashAppCashtag}` : '$cashtag')
                : chain === 'venmo' ? (profile.venmoUsername ? `@${profile.venmoUsername}` : 'username')
                : (profile.zelleContact ? (profile.zelleContact.includes('@') ? profile.zelleContact : profile.zelleContact) : 'email or phone');
              return (
                <button key={chain} onClick={() => handlePickChain(chain)} className={`relative p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] aspect-square min-h-0 shadow-sm piri-card ${flavorCard(chain)}`}>
                  <Plus className="absolute top-2 right-2 w-4 h-4 piri-muted" />
                  <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${flavorLogoBox(chain)}`}>
                    <ChainLogo chain={chain} size={28} />
                  </div>
                  <span className="font-bold text-sm text-piri">{label}</span>
                  <span className="text-xs piri-muted truncate w-full text-center font-semibold">{hint}</span>
                </button>
              );
            })}
          </div>
          {hasAnyAddress && (
            <button onClick={() => setStep('review')} className="w-full mt-5 py-3 rounded-xl font-bold text-sm piri-btn-primary">
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
        <div className="piri-page">
          <div className="max-w-lg mx-auto px-4 py-12">
            <button onClick={() => setStep('chains')} className="mb-6 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <div className="text-center mb-10">
              <h1 className="piri-heading text-3xl font-black mb-2">Cash App</h1>
              <p className="text-sm piri-muted font-semibold">your $cashtag (with or without $)</p>
            </div>
            <div className="space-y-6">
              <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} placeholder="$johndoe or johndoe"
                className="w-full px-4 py-4 rounded-xl border-2 border-piri focus:outline-none focus:ring-2 focus:ring-piri text-piri placeholder-piri-muted text-lg font-semibold" autoFocus />
              <button onClick={handleSaveAddress} disabled={!manualAddress.trim().replace(/^\$/, '').trim()} className="w-full py-4 rounded-xl font-bold text-lg piri-btn-primary disabled:opacity-40 hover:opacity-90 transition-opacity">
                Save $cashtag
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (editingChain === 'venmo') {
      return (
        <div className="piri-page">
          <div className="max-w-lg mx-auto px-4 py-12">
            <button onClick={() => setStep('chains')} className="mb-6 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <div className="text-center mb-10">
              <h1 className="piri-heading text-3xl font-black mb-2">Venmo</h1>
              <p className="text-sm piri-muted font-semibold">your Venmo username (with or without @)</p>
            </div>
            <div className="space-y-6">
              <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} placeholder="@johndoe or johndoe"
                className="w-full px-4 py-4 rounded-xl border-2 border-piri focus:outline-none focus:ring-2 focus:ring-piri text-piri placeholder-piri-muted text-lg font-semibold" autoFocus />
              <button onClick={handleSaveAddress} disabled={!manualAddress.trim().replace(/^@/, '').trim()} className="w-full py-4 rounded-xl font-bold text-lg piri-btn-primary disabled:opacity-40 hover:opacity-90 transition-opacity">
                Save username
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (editingChain === 'zelle') {
      return (
        <div className="piri-page">
          <div className="max-w-lg mx-auto px-4 py-12">
            <button onClick={() => setStep('chains')} className="mb-6 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <div className="text-center mb-10">
              <h1 className="piri-heading text-3xl font-black mb-2">Zelle</h1>
              <p className="text-sm piri-muted font-semibold">email or phone enrolled with Zelle in your bank app</p>
            </div>
            <div className="space-y-6">
              <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} placeholder="you@email.com or (555) 123-4567"
                className="w-full px-4 py-4 rounded-xl border-2 border-piri focus:outline-none focus:ring-2 focus:ring-piri text-piri placeholder-piri-muted text-lg font-semibold" autoFocus />
              <button onClick={handleSaveAddress} disabled={!manualAddress.trim()} className="w-full py-4 rounded-xl font-bold text-lg piri-btn-primary disabled:opacity-40 hover:opacity-90 transition-opacity">
                Save Zelle contact
              </button>
            </div>
          </div>
        </div>
      );
    }

    const chainLabel = editingChain === 'ethereum' ? 'Ethereum' : editingChain === 'base' ? 'Base' : editingChain === 'bitcoin' ? 'Bitcoin' : 'Solana';
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={() => setStep('chains')} className="mb-6 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="text-center mb-10">
            <h1 className="piri-heading text-3xl font-black mb-2">{chainLabel}</h1>
            <p className="text-sm piri-muted font-semibold">
              paste a wallet address
              {editingChain === 'ethereum' ? ' or ENS (e.g. vitalik.eth)' : editingChain === 'base' ? ' or .base name' : editingChain === 'bitcoin' ? ' (1..., 3..., or bc1...)' : ' or .sol domain'}
            </p>
          </div>
          <div className="space-y-6">
            <input type="text" value={manualAddress} onChange={(e) => { setManualAddress(e.target.value); setResolvedAddress(null); setResolveError(null); }}
              placeholder={editingChain === 'ethereum' ? '0x... or name.eth' : editingChain === 'base' ? '0x... or name.base' : editingChain === 'bitcoin' ? 'bc1... or 1... or 3...' : 'Base58 address or name.sol'}
              className="w-full px-4 py-4 rounded-xl border-2 border-piri focus:outline-none focus:ring-2 focus:ring-piri text-piri placeholder-piri-muted text-lg font-semibold" autoFocus />
            {resolvedAddress && (
              <div className="rounded-xl p-4 border-2 border-piri-solana piri-card-solana shadow-sm">
                <div className="text-xs font-bold piri-muted mb-1">Resolved address</div>
                <code className="text-sm text-piri break-all font-semibold">{resolvedAddress}</code>
              </div>
            )}
            {resolveError && (
              <div className="rounded-xl p-4 border-2 border-red-400 bg-red-50">
                <p className="text-sm font-semibold text-red-700">{resolveError}</p>
              </div>
            )}
            {editingChain !== 'bitcoin' && isDomainName(manualAddress) && !resolvedAddress ? (
              <button onClick={() => resolveDomain(manualAddress.trim().toLowerCase())} disabled={isResolving}
                className="w-full py-4 rounded-xl font-bold text-lg piri-btn-primary disabled:opacity-60 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                {isResolving ? <><Loader2 className="w-5 h-5 animate-spin" /> Resolving...</> : <>Resolve {(manualAddress.trim().toLowerCase().includes('.base') || manualAddress.trim().toLowerCase().endsWith('.base')) ? '.base' : manualAddress.trim().toLowerCase().endsWith('.eth') ? 'ENS' : '.sol'} Name</>}
              </button>
            ) : (
              <button onClick={handleSaveAddress} disabled={!manualAddress.trim() && !resolvedAddress}
                className="w-full py-4 rounded-xl font-bold text-lg piri-btn-primary disabled:opacity-40 hover:opacity-90 transition-opacity">
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
    <div className="piri-page">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="piri-heading text-3xl font-black mb-2">Review your Piri</h1>
          <p className="text-sm piri-muted font-semibold">where you'll get paid — crypto & fiat</p>
        </div>
        <div className="space-y-4 mb-8">
          <div className="piri-card rounded-xl border-2 piri-card-ethereum shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-piri flex items-center gap-2"><ChainLogo chain="ethereum" size={20} /> Ethereum</span>
                <div className="flex items-center gap-2">
                  {profile.ethereumAddress && <button onClick={() => removePayment('ethereum')} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1" title="Remove"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
                  <button onClick={() => handlePickChain('ethereum')} className="text-xs font-semibold piri-link">{profile.ethereumAddress ? 'Edit' : 'Add'}</button>
                </div>
              </div>
              {profile.ethereumAddress ? <code className="text-piri text-sm break-all font-semibold">{profile.ethereumAddress}</code> : <button onClick={() => handlePickChain('ethereum')} className="flex items-center gap-1 text-sm font-semibold piri-link"><Plus className="w-4 h-4" /> Add ETH</button>}
            </div>
          </div>
          <div className="piri-card rounded-xl border-2 piri-card-base shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-piri flex items-center gap-2"><ChainLogo chain="base" size={20} /> Base</span>
                <div className="flex items-center gap-2">
                  {profile.baseAddress && <button onClick={() => removePayment('base')} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
                  <button onClick={() => handlePickChain('base')} className="text-xs font-semibold piri-link">{profile.baseAddress ? 'Edit' : 'Add'}</button>
                </div>
              </div>
              {profile.baseAddress ? <code className="text-piri text-sm break-all font-semibold">{profile.baseAddress}</code> : <button onClick={() => handlePickChain('base')} className="flex items-center gap-1 text-sm font-semibold piri-link"><Plus className="w-4 h-4" /> Add Base</button>}
            </div>
          </div>
          <div className="piri-card rounded-xl border-2 piri-card-uva shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-piri flex items-center gap-2"><ChainLogo chain="bitcoin" size={20} /> Bitcoin</span>
                <div className="flex items-center gap-2">
                  {profile.bitcoinAddress && <button onClick={() => removePayment('bitcoin')} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
                  <button onClick={() => handlePickChain('bitcoin')} className="text-xs font-semibold piri-link">{profile.bitcoinAddress ? 'Edit' : 'Add'}</button>
                </div>
              </div>
              {profile.bitcoinAddress ? <code className="text-piri text-sm break-all font-semibold">{profile.bitcoinAddress}</code> : <button onClick={() => handlePickChain('bitcoin')} className="flex items-center gap-1 text-sm font-semibold piri-link"><Plus className="w-4 h-4" /> Add BTC</button>}
            </div>
          </div>
          <div className="piri-card rounded-xl border-2 piri-card-parcha shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-piri flex items-center gap-2"><ChainLogo chain="solana" size={20} /> Solana</span>
                <div className="flex items-center gap-2">
                  {profile.solanaAddress && <button onClick={() => removePayment('solana')} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
                  <button onClick={() => handlePickChain('solana')} className="text-xs font-semibold piri-link">{profile.solanaAddress ? 'Edit' : 'Add'}</button>
                </div>
              </div>
              {profile.solanaAddress ? <code className="text-piri text-sm break-all font-semibold">{profile.solanaAddress}</code> : <button onClick={() => handlePickChain('solana')} className="flex items-center gap-1 text-sm font-semibold piri-link"><Plus className="w-4 h-4" /> Add SOL</button>}
            </div>
          </div>
          <div className="piri-card rounded-xl border-2 piri-card-fresa shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-piri flex items-center gap-2"><ChainLogo chain="cashapp" size={20} /> Cash App</span>
                <div className="flex items-center gap-2">
                  {profile.cashAppCashtag && <button onClick={() => removePayment('cashapp')} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
                  <button onClick={() => handlePickChain('cashapp')} className="text-xs font-semibold piri-link">{profile.cashAppCashtag ? 'Edit' : 'Add'}</button>
                </div>
              </div>
              {profile.cashAppCashtag ? <code className="text-piri text-sm font-semibold">${profile.cashAppCashtag}</code> : <button onClick={() => handlePickChain('cashapp')} className="flex items-center gap-1 text-sm font-semibold piri-link"><Plus className="w-4 h-4" /> Add $cashtag</button>}
            </div>
          </div>
          <div className="piri-card rounded-xl border-2 piri-card-tamarindo shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-piri flex items-center gap-2"><ChainLogo chain="venmo" size={20} /> Venmo</span>
                <div className="flex items-center gap-2">
                  {profile.venmoUsername && <button onClick={() => removePayment('venmo')} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
                  <button onClick={() => handlePickChain('venmo')} className="text-xs font-semibold piri-link">{profile.venmoUsername ? 'Edit' : 'Add'}</button>
                </div>
              </div>
              {profile.venmoUsername ? <code className="text-piri text-sm font-semibold">@{profile.venmoUsername}</code> : <button onClick={() => handlePickChain('venmo')} className="flex items-center gap-1 text-sm font-semibold piri-link"><Plus className="w-4 h-4" /> Add Venmo</button>}
            </div>
          </div>
          <div className="piri-card rounded-xl border-2 piri-card-zelle shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-piri flex items-center gap-2"><ChainLogo chain="zelle" size={20} /> Zelle</span>
                <div className="flex items-center gap-2">
                  {profile.zelleContact && <button onClick={() => removePayment('zelle')} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
                  <button onClick={() => handlePickChain('zelle')} className="text-xs font-semibold piri-link">{profile.zelleContact ? 'Edit' : 'Add'}</button>
                </div>
              </div>
              {profile.zelleContact ? <code className="text-piri text-sm font-semibold break-all">{profile.zelleContact}</code> : <button onClick={() => handlePickChain('zelle')} className="flex items-center gap-1 text-sm font-semibold piri-link"><Plus className="w-4 h-4" /> Add Zelle</button>}
            </div>
          </div>
        </div>
        <button onClick={handleFinalSave} disabled={!hasAnyAddress} className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 piri-btn-primary disabled:opacity-40">
          <Save className="w-5 h-5" /> Save & Generate QR Code
        </button>
        {!hasAnyAddress && <p className="text-center text-sm piri-muted font-semibold mt-4">add at least one to continue</p>}
        <div className="mt-12 text-center">
          <p className="text-xs font-semibold piri-muted">
            Made with <span aria-label="love">🍧</span> for <a href="https://x.com/homebasedotlove" target="_blank" rel="noopener noreferrer" className="piri-link">Home Base</a>
            {' · ETH Denver 2026 · '}
            <a href="https://x.com/adigitaltati" target="_blank" rel="noopener noreferrer" className="piri-link">@adigitaltati</a>
          </p>
        </div>
      </div>
    </div>
  );
}
