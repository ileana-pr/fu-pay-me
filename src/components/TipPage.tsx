import { useState } from 'react';
import { Copy, Check, ArrowLeft, Wallet } from 'lucide-react';
import EthereumTip from './EthereumTip';
import BaseTip from './BaseTip';
import SolanaTip from './SolanaTip';
import { UserProfile } from './ProfileCreation';

type Chain = 'ethereum' | 'base' | 'solana';
type View = 'menu' | 'detail' | 'pay';

interface ChainOption {
  chain: Chain;
  address: string;
  label: string;
  icon: string;
  gradient: string;
  accent: string;
}

export default function TipPage({ profile }: { profile: UserProfile }) {
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [view, setView] = useState<View>('menu');
  const [copied, setCopied] = useState(false);

  // build the list of chains this payee has configured
  const chains: ChainOption[] = [];
  if (profile.ethereumAddress) {
    chains.push({
      chain: 'ethereum',
      address: profile.ethereumAddress,
      label: 'Ethereum',
      icon: '⟠',
      gradient: 'from-blue-500 to-cyan-500',
      accent: 'text-cyan-400',
    });
    // base uses same EVM address as ethereum
    chains.push({
      chain: 'base',
      address: profile.ethereumAddress,
      label: 'Base',
      icon: '⬡',
      gradient: 'from-indigo-500 to-blue-500',
      accent: 'text-indigo-400',
    });
  }
  if (profile.solanaAddress) {
    chains.push({
      chain: 'solana',
      address: profile.solanaAddress,
      label: 'Solana',
      icon: '◎',
      gradient: 'from-purple-500 to-violet-500',
      accent: 'text-purple-400',
    });
  }

  const selected = chains.find(c => c.chain === selectedChain);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelect = (chain: Chain) => {
    setSelectedChain(chain);
    setCopied(false);
    setView('detail');
  };

  const handleBack = () => {
    if (view === 'pay') {
      setView('detail');
    } else {
      setSelectedChain(null);
      setView('menu');
    }
  };

  // ─── full wallet payment flow (EthereumTip / SolanaTip) ───
  if (view === 'pay' && selectedChain === 'ethereum') {
    return (
      <EthereumTip
        onBack={() => setView('detail')}
        receivingAddress={profile.ethereumAddress}
      />
    );
  }
  if (view === 'pay' && selectedChain === 'base') {
    return (
      <BaseTip
        onBack={() => setView('detail')}
        receivingAddress={profile.ethereumAddress}
      />
    );
  }
  if (view === 'pay' && selectedChain === 'solana') {
    return (
      <SolanaTip
        onBack={() => setView('detail')}
        receivingAddress={profile.solanaAddress}
      />
    );
  }

  // ─── detail: address + copy + connect wallet option ───
  if (view === 'detail' && selected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button
            onClick={handleBack}
            className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>

          <div className="text-center mb-10">
            <div className="text-5xl mb-4">{selected.icon}</div>
            <h1 className="text-3xl font-bold mb-2">
              Pay with {selected.label}
            </h1>
            <p className="text-gray-400">copy the address or connect your wallet</p>
          </div>

          {/* address display + copy */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-4">
            <label className="text-xs text-gray-400 mb-3 block uppercase tracking-wider">
              {selected.label} Address
            </label>
            <code className={`${selected.accent} text-sm break-all leading-relaxed block mb-4`}>
              {selected.address}
            </code>
            <button
              onClick={() => copyAddress(selected.address)}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {copied ? (
                <><Check className="w-5 h-5 text-green-400" /> Copied to clipboard</>
              ) : (
                <><Copy className="w-5 h-5" /> Copy Address</>
              )}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-900 px-4 text-sm text-gray-500">or</span>
            </div>
          </div>

          {/* connect wallet to pay directly */}
          <button
            onClick={() => setView('pay')}
            className={`w-full py-4 bg-gradient-to-r ${selected.gradient} rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-opacity`}
          >
            <Wallet className="w-5 h-5" />
            Connect Wallet & Pay
          </button>
        </div>
      </div>
    );
  }

  // ─── linktree-style menu ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            FU Pay Me
          </h1>
          <p className="text-xl text-gray-300">choose a payment method</p>
        </div>

        {chains.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">no payment methods configured</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map((c) => (
              <button
                key={c.chain}
                onClick={() => handleSelect(c.chain)}
                className="w-full p-6 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02]"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${c.gradient} rounded-xl flex items-center justify-center text-3xl`}>
                  {c.icon}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-xl">{c.label}</div>
                  <div className="text-sm text-gray-400">
                    {c.chain === 'ethereum' ? 'ETH & ERC-20 tokens' : c.chain === 'base' ? 'ETH & tokens on Base' : 'SOL & SPL tokens'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-600">powered by FU Pay Me</p>
        </div>
      </div>
    </div>
  );
}
