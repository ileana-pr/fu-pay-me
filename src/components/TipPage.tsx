import { useState } from 'react';
import { Copy, Check, ArrowLeft, Wallet, ExternalLink } from 'lucide-react';
import EthereumTip from './EthereumTip';
import BaseTip from './BaseTip';
import BscTip from './BscTip';
import SolanaTip from './SolanaTip';
import { UserProfile } from './ProfileCreation';

type Chain = 'ethereum' | 'base' | 'bsc' | 'solana';
type PaymentMethod = Chain | 'cashapp' | 'venmo';
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
  const [selectedChain, setSelectedChain] = useState<PaymentMethod | null>(null);
  const [view, setView] = useState<View>('menu');
  const [copied, setCopied] = useState(false);
  const [cashAppAmount, setCashAppAmount] = useState('');
  const [venmoAmount, setVenmoAmount] = useState('');

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
  }
  // base: use dedicated base address if set, else fall back to eth address (same EVM format)
  const baseAddress = profile.baseAddress ?? profile.ethereumAddress;
  if (baseAddress) {
    chains.push({
      chain: 'base',
      address: baseAddress,
      label: 'Base',
      icon: '⬡',
      gradient: 'from-indigo-500 to-blue-500',
      accent: 'text-indigo-400',
    });
  }
  const bscAddress = profile.bscAddress ?? profile.ethereumAddress;
  if (bscAddress) {
    chains.push({
      chain: 'bsc',
      address: bscAddress,
      label: 'BNB Chain',
      icon: '◆',
      gradient: 'from-amber-500 to-yellow-500',
      accent: 'text-amber-400',
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

  const selected = selectedChain && selectedChain !== 'cashapp' && selectedChain !== 'venmo' ? chains.find(c => c.chain === selectedChain) : null;
  const cashtag = profile.cashAppCashtag?.trim() ? profile.cashAppCashtag : null;
  const venmoUsername = profile.venmoUsername?.trim() ? profile.venmoUsername : null;

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelect = (method: PaymentMethod) => {
    setSelectedChain(method);
    setCopied(false);
    if (method === 'cashapp') setCashAppAmount('');
    if (method === 'venmo') setVenmoAmount('');
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
        receivingAddress={baseAddress}
      />
    );
  }
  if (view === 'pay' && selectedChain === 'bsc') {
    return (
      <BscTip
        onBack={() => setView('detail')}
        receivingAddress={bscAddress}
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

  // ─── detail: Venmo — username, amount, open in app ───
  if (view === 'detail' && selectedChain === 'venmo' && venmoUsername) {
    const num = parseFloat(venmoAmount.trim().replace(/[^0-9.]/g, ''));
    const hasValidAmount = !isNaN(num) && num > 0;
    const openVenmo = () => {
      const params = new URLSearchParams({ txn: 'pay' });
      if (hasValidAmount) params.set('amount', String(num));
      window.open(`https://venmo.com/${venmoUsername}?${params.toString()}`, '_blank', 'noopener,noreferrer');
    };
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
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl font-bold text-white">V</div>
            <h1 className="text-3xl font-bold mb-2">Pay with Venmo</h1>
            <p className="text-gray-400">enter amount and open Venmo to pay</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-4">
            <label className="text-xs text-gray-400 mb-3 block uppercase tracking-wider">Pay to</label>
            <code className="text-sky-400 text-lg block mb-4">@{venmoUsername}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(`@${venmoUsername}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {copied ? <><Check className="w-5 h-5 text-green-400" /> Copied</> : <><Copy className="w-5 h-5" /> Copy username</>}
            </button>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-6">
            <label className="text-xs text-gray-400 mb-3 block uppercase tracking-wider">Amount (optional)</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-lg">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={venmoAmount}
                onChange={(e) => setVenmoAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-white placeholder-gray-500 text-lg"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">pre-fills in Venmo when you open the link</p>
          </div>
          <button
            onClick={openVenmo}
            className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-5 h-5" />
            Open in Venmo
          </button>
        </div>
      </div>
    );
  }

  // ─── detail: Cash App — $cashtag, amount, open in app ───
  if (view === 'detail' && selectedChain === 'cashapp' && cashtag) {
    const num = parseFloat(cashAppAmount.trim().replace(/[^0-9.]/g, ''));
    const hasValidAmount = !isNaN(num) && num > 0;
    const openCashApp = () => {
      const amountSegment = hasValidAmount ? `/${num}` : '';
      window.open(`https://cash.app/$${cashtag}${amountSegment}`, '_blank', 'noopener,noreferrer');
    };
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
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-2xl font-bold">$</div>
            <h1 className="text-3xl font-bold mb-2">Pay with Cash App</h1>
            <p className="text-gray-400">enter amount and open Cash App to pay</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-4">
            <label className="text-xs text-gray-400 mb-3 block uppercase tracking-wider">Pay to</label>
            <code className="text-emerald-400 text-lg block mb-4">${cashtag}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(`$${cashtag}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {copied ? <><Check className="w-5 h-5 text-green-400" /> Copied</> : <><Copy className="w-5 h-5" /> Copy $cashtag</>}
            </button>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-6">
            <label className="text-xs text-gray-400 mb-3 block uppercase tracking-wider">Amount (optional)</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-lg">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={cashAppAmount}
                onChange={(e) => setCashAppAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder-gray-500 text-lg"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">pre-fills in Cash App when you open the link</p>
          </div>
          <button
            onClick={openCashApp}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-5 h-5" />
            Open in Cash App
          </button>
        </div>
      </div>
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
            {selected.chain === 'base' ? (
              <div className="w-16 h-16 bg-blue-500 rounded-xl mx-auto mb-4" />
            ) : (
              <div className="text-5xl mb-4">{selected.icon}</div>
            )}
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
          <p className="text-xl text-gray-300">pay with crypto or fiat</p>
        </div>

        {chains.length === 0 && !cashtag && !venmoUsername ? (
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
                  {c.chain === 'base' ? (
                    <div className="w-8 h-8 bg-blue-500 rounded-lg" />
                  ) : (
                    c.icon
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-xl">{c.label}</div>
                  <div className="text-sm text-gray-400">
                    {c.chain === 'ethereum' ? 'ETH & ERC-20 tokens' : c.chain === 'base' ? 'ETH & tokens on Base' : c.chain === 'bsc' ? 'BNB & tokens on BNB Chain' : 'SOL & SPL tokens'}
                  </div>
                </div>
              </button>
            ))}
            {cashtag && (
              <button
                onClick={() => handleSelect('cashapp')}
                className="w-full p-6 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02]"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-2xl font-bold text-white">$</div>
                <div className="text-left">
                  <div className="font-semibold text-xl">Cash App</div>
                  <div className="text-sm text-gray-400">Pay ${cashtag} via Cash App</div>
                </div>
              </button>
            )}
            {venmoUsername && (
              <button
                onClick={() => handleSelect('venmo')}
                className="w-full p-6 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02]"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl font-bold text-white">V</div>
                <div className="text-left">
                  <div className="font-semibold text-xl">Venmo</div>
                  <div className="text-sm text-gray-400">Pay @{venmoUsername} via Venmo</div>
                </div>
              </button>
            )}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-600">
            Made with <span className="text-blue-500">💙</span> for{' '}
            <a
              href="https://x.com/homebasedotlove"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Home Base
            </a>
            {' · ETH Denver 2026 · '}
            <a
              href="https://x.com/adigitaltati"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              @adigitaltati
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
