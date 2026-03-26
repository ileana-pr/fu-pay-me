import { useState, useCallback, useEffect, useMemo } from 'react';
import { logClientError, profileHttpUserMessage } from '../lib/userFacingErrors';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { ArrowLeft, Save, Loader2, Trash2, LogOut, Wallet } from 'lucide-react';
import ChainLogo from './ChainLogo';

// public client for ENS resolution (reads only, no wallet needed)
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// simplified profile — payment addresses for receiving tips
export interface UserProfile {
  /** stable id from backend; when set, link is /tip/:id and updates reflect without reshare */
  id?: string;
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
  /** paypal.me username (e.g. johndoe) — opens paypal.me/username?amount=X when tipper pays */
  paypalUsername?: string;
}

interface ProfileCreationProps {
  onSave: (profile: UserProfile) => void | Promise<void>;
  onSignOut?: () => void;
  /** when user has wallet connected, show quick-add for ETH/Base */
  connectedWalletAddress?: string;
  initialProfile?: UserProfile | null;
}

type Step = 'chains' | 'manual';

const PROFILE_DRAFT_STORAGE_PREFIX = 'piri.profileCreationDraft';

export default function ProfileCreation({ onSave, onSignOut, connectedWalletAddress, initialProfile }: ProfileCreationProps) {
  const draftStorageKey = useMemo(
    () => `${PROFILE_DRAFT_STORAGE_PREFIX}:${initialProfile?.id ?? connectedWalletAddress ?? 'default'}`,
    [initialProfile?.id, connectedWalletAddress]
  );
  const [step, setStep] = useState<Step>('chains');
  const [profile, setProfile] = useState<UserProfile>({
    id: initialProfile?.id,
    ethereumAddress: initialProfile?.ethereumAddress ?? '',
    baseAddress: initialProfile?.baseAddress ?? '',
    bitcoinAddress: initialProfile?.bitcoinAddress ?? '',
    solanaAddress: initialProfile?.solanaAddress ?? '',
    cashAppCashtag: initialProfile?.cashAppCashtag ?? '',
    venmoUsername: initialProfile?.venmoUsername ?? '',
    zelleContact: initialProfile?.zelleContact ?? '',
    paypalUsername: initialProfile?.paypalUsername ?? '',
  });
  const [editingChain, setEditingChain] = useState<'ethereum' | 'base' | 'bitcoin' | 'solana' | 'cashapp' | 'venmo' | 'zelle' | 'paypal'>('ethereum');
  const [manualAddress, setManualAddress] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      if (!rawDraft) {
        setIsDraftHydrated(true);
        return;
      }
      const parsed = JSON.parse(rawDraft) as {
        profile?: UserProfile;
        step?: Step;
        editingChain?: 'ethereum' | 'base' | 'bitcoin' | 'solana' | 'cashapp' | 'venmo' | 'zelle' | 'paypal';
        manualAddress?: string;
      };
      if (parsed.profile) setProfile(parsed.profile);
      if (parsed.step === 'manual' || parsed.step === 'chains') setStep(parsed.step);
      if (parsed.editingChain) setEditingChain(parsed.editingChain);
      if (typeof parsed.manualAddress === 'string') setManualAddress(parsed.manualAddress);
    } catch (e) {
      logClientError('hydrate profile draft', e);
    } finally {
      setIsDraftHydrated(true);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isDraftHydrated) return;
    try {
      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          profile,
          step,
          editingChain,
          manualAddress,
        })
      );
    } catch (e) {
      logClientError('persist profile draft', e);
    }
  }, [draftStorageKey, profile, step, editingChain, manualAddress, isDraftHydrated]);

  const getAddressForChain = (chain: 'ethereum' | 'base' | 'bitcoin' | 'solana' | 'cashapp' | 'venmo' | 'zelle' | 'paypal') =>
    chain === 'ethereum' ? profile.ethereumAddress : chain === 'base' ? profile.baseAddress : chain === 'bitcoin' ? profile.bitcoinAddress : chain === 'solana' ? profile.solanaAddress : chain === 'cashapp' ? (profile.cashAppCashtag ?? '') : chain === 'venmo' ? (profile.venmoUsername ?? '') : chain === 'zelle' ? (profile.zelleContact ?? '') : (profile.paypalUsername ?? '');

  const handlePickChain = (chain: 'ethereum' | 'base' | 'bitcoin' | 'solana' | 'cashapp' | 'venmo' | 'zelle' | 'paypal') => {
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
      // .base and .base.eth: ENS subdomains on mainnet
      if (domain.endsWith('.base.eth') || domain.endsWith('.base') || domain.includes('.base')) {
        const name = domain.replace(/\.base\.eth$/i, '').replace(/\.base$/i, '').trim();
        if (!name) throw new Error('BASE_NAME_INVALID');
        // .base and .base.eth are ENS subdomains on mainnet
        const ensName = domain.endsWith('.base.eth') ? domain : `${domain}.eth`;
        const address = await ensClient.getEnsAddress({ name: normalize(ensName) });
        if (!address) throw new Error('BASE_RESOLVE_FAIL');
        setResolvedAddress(address);
      } else if (domain.endsWith('.eth')) {
        const address = await ensClient.getEnsAddress({ name: normalize(domain) });
        if (!address) throw new Error('ENS_RESOLVE_FAIL');
        setResolvedAddress(address);
      } else if (domain.endsWith('.sol')) {
        const res = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${domain.replace('.sol', '')}`);
        if (!res.ok) throw new Error('SOL_RESOLVE_FAIL');
        const data = await res.json();
        if (!data.result) throw new Error('SOL_NAME_FAIL');
        setResolvedAddress(data.result);
      }
    } catch (err) {
      const key = err instanceof Error ? err.message : '';
      const friendly =
        key === 'BASE_NAME_INVALID' ? 'That doesn’t look like a valid name. Try again.'
          : key === 'BASE_RESOLVE_FAIL' ? 'We couldn’t find a wallet for that .base name.'
            : key === 'ENS_RESOLVE_FAIL' ? 'We couldn’t find a wallet for that ENS name.'
              : key === 'SOL_RESOLVE_FAIL' || key === 'SOL_NAME_FAIL' ? 'We couldn’t find a wallet for that .sol name.'
                : 'We couldn’t look up that name. Try again.';
      logClientError('resolveDomain', err);
      setResolveError(friendly);
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
      setStep('chains');
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
      setStep('chains');
      return;
    }
    // zelle: store email or phone as-is (trimmed)
    if (editingChain === 'zelle') {
      if (!trimmed) return;
      setProfile(p => ({ ...p, zelleContact: trimmed }));
      setManualAddress('');
      setResolvedAddress(null);
      setResolveError(null);
      setStep('chains');
      return;
    }
    // paypal: accept paypal.me/johndoe, @johndoe, or johndoe; store username only, lowercase
    if (editingChain === 'paypal') {
      const username = trimmed
        .replace(/^https?:\/\/paypal\.me\//i, '')
        .replace(/^@/, '')
        .toLowerCase()
        .trim();
      if (!username) return;
      setProfile(p => ({ ...p, paypalUsername: username }));
      setManualAddress('');
      setResolvedAddress(null);
      setResolveError(null);
      setStep('chains');
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
    setStep('chains');
  };

  const handleFinalSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(profile);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(draftStorageKey);
      }
    } catch (e) {
      logClientError('ProfileCreation save', e);
      setSaveError(e instanceof Error ? e.message : profileHttpUserMessage(500));
    } finally {
      setIsSaving(false);
    }
  };

  const removePayment = (kind: 'ethereum' | 'base' | 'bitcoin' | 'solana' | 'cashapp' | 'venmo' | 'zelle' | 'paypal') => {
    if (kind === 'ethereum') setProfile(p => ({ ...p, ethereumAddress: '' }));
    else if (kind === 'base') setProfile(p => ({ ...p, baseAddress: '' }));
    else if (kind === 'bitcoin') setProfile(p => ({ ...p, bitcoinAddress: '' }));
    else if (kind === 'solana') setProfile(p => ({ ...p, solanaAddress: '' }));
    else if (kind === 'cashapp') setProfile(p => ({ ...p, cashAppCashtag: '' }));
    else if (kind === 'venmo') setProfile(p => ({ ...p, venmoUsername: '' }));
    else if (kind === 'zelle') setProfile(p => ({ ...p, zelleContact: '' }));
    else setProfile(p => ({ ...p, paypalUsername: '' }));
  };

  const hasAnyAddress = profile.ethereumAddress || profile.baseAddress || profile.bitcoinAddress || profile.solanaAddress || !!profile.cashAppCashtag?.trim() || !!profile.venmoUsername?.trim() || !!profile.zelleContact?.trim() || !!profile.paypalUsername?.trim();

  // flavor styling per method (no flavor names in UI)
  const flavorCard = (ch: typeof editingChain) =>
    ch === 'ethereum' ? 'piri-card-ethereum' : ch === 'base' ? 'piri-card-base' : ch === 'bitcoin' ? 'piri-card-bitcoin' : ch === 'solana' ? 'piri-card-solana' : ch === 'cashapp' ? 'piri-card-cashapp' : ch === 'venmo' ? 'piri-card-venmo' : ch === 'zelle' ? 'piri-card-zelle' : 'piri-card-paypal';

  // ─── step 1: your flavors (add/edit, then save all) ───
  if (step === 'chains') {
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-6">
          {onSignOut && (
            <div className="mb-4 flex justify-end">
              <button onClick={onSignOut} className="flex items-center gap-2 font-semibold text-sm text-piri-muted hover:text-piri transition-opacity">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
          <div className="text-center mb-6">
            <h1 className="piri-heading text-2xl font-black mb-1">Your flavors</h1>
            <p className="text-sm piri-muted font-semibold">add crypto wallets and fiat apps — Piri supports them all</p>
          </div>
          <div className="space-y-4">
            {(['ethereum', 'base', 'bitcoin', 'solana', 'cashapp', 'venmo', 'zelle', 'paypal'] as const).map((chain) => {
              const label = chain === 'ethereum' ? 'Ethereum' : chain === 'base' ? 'Base' : chain === 'bitcoin' ? 'Bitcoin' : chain === 'solana' ? 'Solana' : chain === 'cashapp' ? 'Cash App' : chain === 'venmo' ? 'Venmo' : chain === 'zelle' ? 'Zelle' : 'PayPal';
              const hasValue = chain === 'ethereum' ? !!profile.ethereumAddress : chain === 'base' ? !!profile.baseAddress : chain === 'bitcoin' ? !!profile.bitcoinAddress : chain === 'solana' ? !!profile.solanaAddress : chain === 'cashapp' ? !!profile.cashAppCashtag?.trim() : chain === 'venmo' ? !!profile.venmoUsername?.trim() : chain === 'zelle' ? !!profile.zelleContact?.trim() : !!profile.paypalUsername?.trim();
              const displayValue = chain === 'ethereum' ? profile.ethereumAddress : chain === 'base' ? profile.baseAddress : chain === 'bitcoin' ? profile.bitcoinAddress : chain === 'solana' ? profile.solanaAddress : chain === 'cashapp' ? (profile.cashAppCashtag ? `$${profile.cashAppCashtag}` : '') : chain === 'venmo' ? (profile.venmoUsername ? `@${profile.venmoUsername}` : '') : chain === 'zelle' ? (profile.zelleContact ?? '') : (profile.paypalUsername ? `paypal.me/${profile.paypalUsername}` : '');
              return (
                <div key={chain} className={`piri-card rounded-xl border-2 p-4 shadow-sm ${flavorCard(chain)}`}>
                  <div className="mb-1 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-0">
                    <span className="min-w-0 font-bold text-piri flex items-center gap-2 md:flex-1">
                      <ChainLogo chain={chain} size={20} />
                      {label}
                    </span>
                    <div className="flex items-center gap-3 pl-7 md:pl-0 md:gap-2 md:shrink-0">
                      {hasValue && <button type="button" onClick={(e) => { e.stopPropagation(); removePayment(chain); }} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1" title="Remove"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
                      <button type="button" onClick={() => handlePickChain(chain)} className="text-xs font-semibold piri-link">{hasValue ? 'Edit' : 'Add'}</button>
                    </div>
                  </div>
                  {hasValue ? <code className="block text-piri text-sm break-all font-semibold">{displayValue}</code> : null}
                </div>
              );
            })}
          </div>
          {saveError && (
            <div className="mt-4 rounded-xl p-4 border-2 border-red-400 bg-red-50">
              <p className="text-sm font-semibold text-red-700">{saveError}</p>
            </div>
          )}
          {hasAnyAddress && (
            <button onClick={handleFinalSave} disabled={isSaving} className="w-full mt-5 py-3 rounded-xl font-bold text-sm piri-btn-primary disabled:opacity-40 flex items-center justify-center gap-2">
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save all</>}
            </button>
          )}
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
              <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (manualAddress.trim().replace(/^\$/, '').trim()) handleSaveAddress(); } }}
                placeholder="$johndoe or johndoe"
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
              <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (manualAddress.trim().replace(/^@/, '').trim()) handleSaveAddress(); } }}
                placeholder="@johndoe or johndoe"
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
              <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (manualAddress.trim()) handleSaveAddress(); } }}
                placeholder="you@email.com or (555) 123-4567"
                className="w-full px-4 py-4 rounded-xl border-2 border-piri focus:outline-none focus:ring-2 focus:ring-piri text-piri placeholder-piri-muted text-lg font-semibold" autoFocus />
              <button onClick={handleSaveAddress} disabled={!manualAddress.trim()} className="w-full py-4 rounded-xl font-bold text-lg piri-btn-primary disabled:opacity-40 hover:opacity-90 transition-opacity">
                Save Zelle contact
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (editingChain === 'paypal') {
      return (
        <div className="piri-page">
          <div className="max-w-lg mx-auto px-4 py-12">
            <button onClick={() => setStep('chains')} className="mb-6 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <div className="text-center mb-10">
              <h1 className="piri-heading text-3xl font-black mb-2">PayPal</h1>
              <p className="text-sm piri-muted font-semibold">your paypal.me username (paypal.me/johndoe, @johndoe, or johndoe)</p>
            </div>
            <div className="space-y-6">
              <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (manualAddress.trim().replace(/^https?:\/\/paypal\.me\//i, '').replace(/^@/, '').trim()) handleSaveAddress(); } }}
                placeholder="paypal.me/johndoe or @johndoe or johndoe"
                className="w-full px-4 py-4 rounded-xl border-2 border-piri focus:outline-none focus:ring-2 focus:ring-piri text-piri placeholder-piri-muted text-lg font-semibold" autoFocus />
              <button onClick={handleSaveAddress} disabled={!manualAddress.trim().replace(/^https?:\/\/paypal\.me\//i, '').replace(/^@/, '').trim()} className="w-full py-4 rounded-xl font-bold text-lg piri-btn-primary disabled:opacity-40 hover:opacity-90 transition-opacity">
                Save PayPal username
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
            {(editingChain === 'ethereum' || editingChain === 'base') && connectedWalletAddress && (
              <button
                type="button"
                onClick={() => {
                  setManualAddress(connectedWalletAddress);
                  setResolvedAddress(null);
                  setResolveError(null);
                }}
                className="w-full py-3 rounded-xl border-2 border-dashed border-piri flex items-center justify-center gap-2 font-semibold text-piri hover:bg-piri/5 transition-colors"
              >
                <Wallet className="w-5 h-5" />
                Use connected wallet
              </button>
            )}
            <input type="text" value={manualAddress} onChange={(e) => { setManualAddress(e.target.value); setResolvedAddress(null); setResolveError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const trimmed = manualAddress.trim();
                  const isDomain = trimmed && isDomainName(trimmed);
                  if (isDomain && !resolvedAddress) resolveDomain(trimmed.toLowerCase());
                  else if (trimmed || resolvedAddress) handleSaveAddress();
                }
              }}
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

  return null;
}
