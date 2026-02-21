import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { ArrowLeft, Check, X, Plus, Save, Wallet, Loader2 } from 'lucide-react';

// public client for ENS resolution (reads only, no wallet needed)
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// simplified profile — only eth and sol
export interface UserProfile {
  ethereumAddress: string;
  solanaAddress: string;
}

interface ProfileCreationProps {
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
}

type Step = 'connect' | 'confirm' | 'chains' | 'manual' | 'review';

export default function ProfileCreation({ onSave, onBack }: ProfileCreationProps) {
  const [step, setStep] = useState<Step>('connect');
  const [profile, setProfile] = useState<UserProfile>({
    ethereumAddress: '',
    solanaAddress: '',
  });
  const [detectedChain, setDetectedChain] = useState<'ethereum' | 'solana' | null>(null);
  const [detectedAddress, setDetectedAddress] = useState('');
  const [editingChain, setEditingChain] = useState<'ethereum' | 'solana'>('ethereum');
  const [manualAddress, setManualAddress] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const mountedWithEthConnected = useRef(false);
  const mountedWithSolConnected = useRef(false);
  const hasCapturedInitial = useRef(false);

  // eth wallet hooks
  const { address: ethAddress, isConnected: ethConnected } = useAccount();
  const { open } = useAppKit();
  const { disconnect: disconnectEth } = useDisconnect();

  // sol wallet hooks
  const solWallet = useWallet();

  // capture connection state on mount — we only auto-advance when connection happens *after* user clicks
  useEffect(() => {
    if (!hasCapturedInitial.current) {
      mountedWithEthConnected.current = !!ethAddress;
      mountedWithSolConnected.current = !!solWallet.connected;
      hasCapturedInitial.current = true;
    }
  }, [ethAddress, solWallet.connected]);

  // when eth wallet connects (after user clicked), move to confirm step
  useEffect(() => {
    if (step !== 'connect') return;
    if (ethConnected && ethAddress && !mountedWithEthConnected.current) {
      setDetectedChain('ethereum');
      setDetectedAddress(ethAddress);
      setStep('confirm');
    }
  }, [ethConnected, ethAddress, step]);

  // auto-connect solana after wallet selection
  const { wallet: solSelectedWallet, connected: solConnected, connect: solConnect } = solWallet;
  useEffect(() => {
    if (solSelectedWallet && !solConnected && step === 'connect') {
      solConnect().catch(console.error);
    }
  }, [solSelectedWallet, solConnected, solConnect, step]);

  // when sol wallet connects (after user clicked), move to confirm step
  useEffect(() => {
    if (step !== 'connect') return;
    if (solWallet.connected && solWallet.publicKey && !mountedWithSolConnected.current) {
      setDetectedChain('solana');
      setDetectedAddress(solWallet.publicKey.toBase58());
      setStep('confirm');
    }
  }, [solWallet.connected, solWallet.publicKey, step]);

  const handleConnectEth = async () => {
    if (ethConnected && ethAddress) {
      setDetectedChain('ethereum');
      setDetectedAddress(ethAddress);
      setStep('confirm');
      return;
    }
    try {
      await open({ view: 'Connect' });
    } catch (err) {
      console.error('ETH connect error:', err);
    }
  };

  const handleConnectSol = () => {
    if (solWallet.connected && solWallet.publicKey) {
      setDetectedChain('solana');
      setDetectedAddress(solWallet.publicKey.toBase58());
      setStep('confirm');
      return;
    }
    const installed = solWallet.wallets.find(
      w => w.readyState === 'Installed' || w.readyState === 'Loadable'
    );
    if (installed) {
      solWallet.select(installed.adapter.name);
    }
  };

  // user confirms detected wallet address
  const handleYes = () => {
    if (detectedChain === 'ethereum') {
      setProfile(p => ({ ...p, ethereumAddress: detectedAddress }));
    } else if (detectedChain === 'solana') {
      setProfile(p => ({ ...p, solanaAddress: detectedAddress }));
    }
    setStep('review');
  };

  // user rejects detected wallet — go to manual chain selection
  const handleNo = () => {
    disconnectEth();
    solWallet.disconnect();
    setDetectedChain(null);
    setDetectedAddress('');
    setStep('chains');
  };

  // user picks a chain for manual address entry
  const handlePickChain = (chain: 'ethereum' | 'solana') => {
    setEditingChain(chain);
    setManualAddress('');
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
        // bonfida's free public API for .sol domain resolution
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

  // save the manually entered (or resolved) address
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

  // ─── step 1: connect wallet ───
  if (step === 'connect') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-6">
              <Wallet className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Connect Your Wallet</h1>
            <p className="text-gray-400">we'll detect your address automatically</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleConnectEth}
              className="w-full p-5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">
                🔗
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-lg">Ethereum Wallet</div>
                <div className="text-sm text-gray-400">WalletConnect — scan QR or open wallet</div>
              </div>
            </button>

            <div className="text-sm text-gray-400 mt-4 mb-2">Or connect Solana:</div>
            <button
              onClick={handleConnectSol}
              className="w-full p-5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02]"
            >
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-2xl">
                ◎
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Solana Wallet</div>
                <div className="text-sm text-gray-400">Phantom, Solflare, etc.</div>
              </div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setStep('chains')}
              className="text-sm text-gray-500 hover:text-gray-300 underline transition-colors"
            >
              Skip — enter addresses manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── step 2: confirm detected address ───
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-6">
              <Check className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Wallet Connected!</h1>
            <p className="text-gray-400">
              we detected your {detectedChain === 'ethereum' ? 'Ethereum' : 'Solana'} address
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-8">
            <label className="text-sm text-gray-400 mb-2 block">
              {detectedChain === 'ethereum' ? 'ETH' : 'SOL'} Address
            </label>
            <code className="text-cyan-400 text-sm break-all">{detectedAddress}</code>
          </div>

          <p className="text-center text-lg mb-6">
            Is this the wallet you want to receive payments to?
          </p>

          <div className="flex gap-4">
            <button
              onClick={handleYes}
              className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> Yes, use this
            </button>
            <button
              onClick={handleNo}
              className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" /> No, enter manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── step 3: pick a chain (manual path) ───
  if (step === 'chains') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button
            onClick={() => setStep('connect')}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">Choose a Chain</h1>
            <p className="text-gray-400">which blockchain do you want to receive payments on?</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handlePickChain('ethereum')}
              className="w-full p-6 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02]"
            >
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center text-3xl">
                ⟠
              </div>
              <div className="text-left">
                <div className="font-semibold text-xl">Ethereum</div>
                <div className="text-sm text-gray-400">ETH & ERC-20 tokens</div>
              </div>
            </button>

            <button
              onClick={() => handlePickChain('solana')}
              className="w-full p-6 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02]"
            >
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center text-3xl">
                ◎
              </div>
              <div className="text-left">
                <div className="font-semibold text-xl">Solana</div>
                <div className="text-sm text-gray-400">SOL & SPL tokens</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── step 4: manual address input ───
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
              Enter {editingChain === 'ethereum' ? 'Ethereum' : 'Solana'} Address
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

            {/* resolved address display */}
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

            {/* resolve button (when domain detected) or save button */}
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

  // ─── step 5: review & save ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Review Your Profile</h1>
          <p className="text-gray-400">here's what you've set up</p>
        </div>

        <div className="space-y-4 mb-8">
          {/* ethereum */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">⟠</span>
                <span className="font-semibold">Ethereum</span>
              </div>
              {profile.ethereumAddress && (
                <button
                  onClick={() => {
                    setEditingChain('ethereum');
                    setManualAddress(profile.ethereumAddress);
                    setStep('manual');
                  }}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {profile.ethereumAddress ? (
              <code className="text-cyan-400 text-sm break-all">
                {profile.ethereumAddress}
              </code>
            ) : (
              <button
                onClick={() => handlePickChain('ethereum')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-cyan-400 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add ETH address
              </button>
            )}
          </div>

          {/* solana */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">◎</span>
                <span className="font-semibold">Solana</span>
              </div>
              {profile.solanaAddress && (
                <button
                  onClick={() => {
                    setEditingChain('solana');
                    setManualAddress(profile.solanaAddress);
                    setStep('manual');
                  }}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {profile.solanaAddress ? (
              <code className="text-purple-400 text-sm break-all">
                {profile.solanaAddress}
              </code>
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
          <p className="text-center text-sm text-gray-500 mt-4">
            add at least one address to continue
          </p>
        )}
      </div>
    </div>
  );
}
