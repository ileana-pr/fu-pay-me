import { useState, useEffect } from 'react';
import { Copy, Check, ArrowLeft, Wallet, ExternalLink } from 'lucide-react';
import EthereumTip from './EthereumTip';
import BaseTip from './BaseTip';
import SolanaTip from './SolanaTip';
import TezosTip from './TezosTip';
import ChainLogo from './ChainLogo';
import { UserProfile } from './ProfileCreation';

type Chain = 'ethereum' | 'base' | 'bitcoin' | 'solana' | 'tezos';
type PaymentMethod = Chain | 'cashapp' | 'venmo' | 'zelle' | 'paypal';
type View = 'menu' | 'detail' | 'pay';

function payeeInitials(displayName: string): string {
  const t = displayName.trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function TipPayeeHeader({ profile }: { profile: UserProfile }) {
  const displayName = profile.displayName?.trim() ?? '';
  const avatarUrl = profile.avatarUrl?.trim() ?? '';
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);
  const showAvatar = Boolean(avatarUrl) && !imgFailed;
  const title = displayName || 'Send a payment';

  return (
    <div className="text-center mb-10">
      <div className="flex justify-center mb-4">
        {showAvatar ? (
          <img
            src={avatarUrl}
            alt=""
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover border-2 border-piri-cashapp shadow-lg bg-piri-cream"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full border-2 border-piri-cashapp bg-piri-cream flex items-center justify-center shadow-lg piri-heading text-2xl font-black text-piri"
            aria-hidden
          >
            {payeeInitials(displayName)}
          </div>
        )}
      </div>
      <h1 className="piri-heading text-3xl sm:text-4xl font-black mb-2">{title}</h1>
      <p className="text-xl font-bold text-piri">choose a payment method</p>
      <p className="text-xs font-semibold piri-muted mt-2">Powered by Piri</p>
    </div>
  );
}

// original piri flavor palette for tiles/cards; no flavor names on labels
interface ChainOption {
  chain: Chain;
  address: string;
  label: string;
  cardClass: string;
  logoBoxClass: string; // border + bg for logo well, e.g. border-piri-ethereum bg-piri-ethereum/20
  btnClass: string;
}

export default function TipPage({ profile }: { profile: UserProfile }) {
  const [selectedChain, setSelectedChain] = useState<PaymentMethod | null>(null);
  const [view, setView] = useState<View>('menu');
  const [copied, setCopied] = useState(false);
  const [cashAppAmount, setCashAppAmount] = useState('');
  const [venmoAmount, setVenmoAmount] = useState('');
  const [paypalAmount, setPaypalAmount] = useState('');

  // build the list of chains this payee has configured
  const chains: ChainOption[] = [];
  if (profile.ethereumAddress) {
    chains.push({ chain: 'ethereum', address: profile.ethereumAddress, label: 'Ethereum', cardClass: 'piri-card-ethereum', logoBoxClass: 'border-piri-ethereum bg-piri-ethereum/20', btnClass: 'bg-piri-ethereum' });
  }
  const baseAddress = profile.baseAddress ?? profile.ethereumAddress;
  if (baseAddress) {
    chains.push({ chain: 'base', address: baseAddress, label: 'Base', cardClass: 'piri-card-base', logoBoxClass: 'border-piri-base bg-piri-base/20', btnClass: 'bg-piri-base' });
  }
  if (profile.bitcoinAddress) {
    chains.push({ chain: 'bitcoin', address: profile.bitcoinAddress, label: 'Bitcoin', cardClass: 'piri-card-bitcoin', logoBoxClass: 'border-piri-bitcoin bg-piri-bitcoin/20', btnClass: 'bg-piri-bitcoin' });
  }
  if (profile.solanaAddress) {
    chains.push({ chain: 'solana', address: profile.solanaAddress, label: 'Solana', cardClass: 'piri-card-solana', logoBoxClass: 'border-piri-solana bg-piri-solana/20', btnClass: 'bg-piri-solana' });
  }
  if (profile.tezosAddress?.trim()) {
    chains.push({ chain: 'tezos', address: profile.tezosAddress.trim(), label: 'Tezos', cardClass: 'piri-card-tezos', logoBoxClass: 'border-piri-tezos bg-piri-tezos/20', btnClass: 'bg-piri-tezos' });
  }

  const selected = selectedChain && selectedChain !== 'cashapp' && selectedChain !== 'venmo' && selectedChain !== 'zelle' && selectedChain !== 'paypal' ? chains.find(c => c.chain === selectedChain) : null;
  const cashtag = profile.cashAppCashtag?.trim() ? profile.cashAppCashtag : null;
  const venmoUsername = profile.venmoUsername?.trim() ? profile.venmoUsername : null;
  const zelleContact = profile.zelleContact?.trim() ? profile.zelleContact : null;
  const paypalUsername = profile.paypalUsername?.trim() ? profile.paypalUsername : null;

  const hasPayeePersona = Boolean(profile.displayName?.trim() || profile.avatarUrl?.trim());

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
    if (method === 'paypal') setPaypalAmount('');
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
  if (view === 'pay' && selectedChain === 'bitcoin') {
    const btcAddress = profile.bitcoinAddress ?? '';
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={() => setView('detail')} className="mb-8 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl border-2 border-piri-bitcoin bg-piri-bitcoin/20 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ChainLogo chain="bitcoin" size={36} />
            </div>
            <h1 className="piri-heading text-3xl font-black mb-2">Bitcoin</h1>
            <p className="text-sm font-semibold piri-muted">copy the address or open in your wallet</p>
          </div>
          <div className="rounded-xl p-6 mb-4 border-2 border-piri-bitcoin piri-card-bitcoin shadow-sm">
            <label className="text-xs font-bold piri-muted mb-3 block uppercase tracking-wider">Bitcoin Address</label>
            <code className="text-piri text-sm break-all leading-relaxed block mb-4 font-semibold">{btcAddress}</code>
            <button onClick={() => copyAddress(btcAddress)} className="w-full py-3 rounded-xl font-bold text-white bg-piri-bitcoin flex items-center justify-center gap-2 transition-opacity hover:opacity-90">
              {copied ? <><Check className="w-5 h-5" /> Copied</> : <><Copy className="w-5 h-5" /> Copy Address</>}
            </button>
          </div>
          <a href={`bitcoin:${btcAddress}`} className="w-full py-4 rounded-xl font-bold text-white bg-piri-bitcoin flex items-center justify-center gap-3 transition-opacity hover:opacity-90 no-underline">
            <ExternalLink className="w-5 h-5" />
            Open in Wallet
          </a>
          <p className="text-center text-sm piri-muted mt-4">If nothing opens, your device has no Bitcoin app set for links. Use <strong>Copy Address</strong> above and paste into Phantom, Sparrow, or any BTC wallet.</p>
        </div>
      </div>
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
  if (view === 'pay' && selectedChain === 'tezos' && profile.tezosAddress?.trim()) {
    return <TezosTip onBack={() => setView('detail')} receivingAddress={profile.tezosAddress.trim()} />;
  }

  if (view === 'detail' && selectedChain === 'venmo' && venmoUsername) {
    const num = parseFloat(venmoAmount.trim().replace(/[^0-9.]/g, ''));
    const hasValidAmount = !isNaN(num) && num > 0;
    const openVenmo = () => {
      const params = new URLSearchParams({ txn: 'pay' });
      if (hasValidAmount) params.set('amount', String(num));
      window.open(`https://venmo.com/${venmoUsername}?${params.toString()}`, '_blank', 'noopener,noreferrer');
    };
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={handleBack} className="mb-8 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl border-2 border-piri-venmo bg-piri-venmo/20 flex items-center justify-center shadow-sm">
              <ChainLogo chain="venmo" size={32} />
            </div>
            <h1 className="piri-heading text-3xl font-black mb-2">Venmo</h1>
            <p className="text-sm font-semibold piri-muted">enter amount, then open Venmo to pay</p>
          </div>
          <div className="piri-card border-2 border-piri-venmo piri-card-venmo rounded-xl p-4 flex items-center gap-3 mb-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold piri-muted block mb-1">Pay to</label>
              <code className="text-piri text-lg font-semibold block">@{venmoUsername}</code>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`@${venmoUsername}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-4 py-2 rounded-xl font-bold text-white bg-piri-venmo flex items-center gap-2 transition-opacity hover:opacity-90">
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <div className="rounded-xl p-6 mb-6 border-2 border-piri-venmo piri-card-venmo shadow-sm">
            <label className="text-xs font-bold piri-muted mb-3 block uppercase tracking-wider">Amount (optional)</label>
            <div className="flex items-center gap-2">
              <span className="text-piri text-lg">$</span>
              <input type="text" inputMode="decimal" value={venmoAmount} onChange={(e) => setVenmoAmount(e.target.value)} placeholder="0.00"
                className="flex-1 px-4 py-3 rounded-lg border-2 border-piri focus:outline-none focus:ring-2 focus:ring-piri text-piri placeholder-piri-muted text-lg font-semibold" />
            </div>
            <p className="text-xs piri-muted mt-2">Piri pre-fills this in Venmo when you open the link</p>
          </div>
          <button onClick={openVenmo} className="w-full py-4 rounded-xl font-bold text-white bg-piri-venmo flex items-center justify-center gap-3 transition-opacity hover:opacity-90">
            <ExternalLink className="w-5 h-5" />
            Open in Venmo
          </button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedChain === 'paypal' && paypalUsername) {
    const num = parseFloat(paypalAmount.trim().replace(/[^0-9.]/g, ''));
    const hasValidAmount = !isNaN(num) && num > 0;
    const openPayPal = () => {
      const params = new URLSearchParams({ currency: 'USD' });
      if (hasValidAmount) params.set('amount', String(num));
      const qs = params.toString();
      window.open(`https://paypal.me/${paypalUsername}${qs ? `?${qs}` : ''}`, '_blank', 'noopener,noreferrer');
    };
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={handleBack} className="mb-8 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl border-2 border-piri-paypal bg-piri-paypal/20 flex items-center justify-center shadow-sm">
              <ChainLogo chain="paypal" size={32} />
            </div>
            <h1 className="piri-heading text-3xl font-black mb-2">PayPal</h1>
            <p className="text-sm font-semibold piri-muted">enter amount, then open PayPal to pay</p>
          </div>
          <div className="piri-card border-2 border-piri-paypal piri-card-paypal rounded-xl p-4 flex items-center gap-3 mb-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold piri-muted block mb-1">Pay to</label>
              <code className="text-piri text-lg font-semibold block">paypal.me/{paypalUsername}</code>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`paypal.me/${paypalUsername}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-4 py-2 rounded-xl font-bold text-white bg-piri-paypal flex items-center gap-2 transition-opacity hover:opacity-90">
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <div className="rounded-xl p-6 mb-6 border-2 border-piri-paypal piri-card-paypal shadow-sm">
            <label className="text-xs font-bold piri-muted mb-3 block uppercase tracking-wider">Amount (optional)</label>
            <div className="flex items-center gap-2">
              <span className="text-piri text-lg">$</span>
              <input type="text" inputMode="decimal" value={paypalAmount} onChange={(e) => setPaypalAmount(e.target.value)} placeholder="0.00"
                className="flex-1 px-4 py-3 rounded-lg border-2 border-piri focus:outline-none focus:ring-2 focus:ring-piri text-piri placeholder-piri-muted text-lg font-semibold" />
            </div>
            <p className="text-xs piri-muted mt-2">Piri pre-fills this in PayPal when you open the link</p>
          </div>
          <button onClick={openPayPal} className="w-full py-4 rounded-xl font-bold text-white bg-piri-paypal flex items-center justify-center gap-3 transition-opacity hover:opacity-90">
            <ExternalLink className="w-5 h-5" />
            Open in PayPal
          </button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedChain === 'zelle' && zelleContact) {
    const openZelle = () => {
      window.open('https://www.zellepay.com', '_blank', 'noopener,noreferrer');
    };
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={handleBack} className="mb-8 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl border-2 border-piri-zelle bg-piri-zelle/20 flex items-center justify-center shadow-sm">
              <ChainLogo chain="zelle" size={32} />
            </div>
            <h1 className="piri-heading text-3xl font-black mb-2">Zelle</h1>
            <p className="text-sm font-semibold piri-muted">copy contact, then open Zelle in your bank app</p>
          </div>
          <div className="piri-card border-2 border-piri-zelle piri-card-zelle rounded-xl p-4 flex items-center gap-3 mb-6 shadow-sm">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold piri-muted block mb-1">Pay to</label>
              <code className="text-piri text-lg font-semibold block break-all">{zelleContact}</code>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(zelleContact); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-4 py-2 rounded-xl font-bold text-white bg-piri-zelle flex items-center gap-2 transition-opacity hover:opacity-90 shrink-0">
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <button onClick={openZelle} className="w-full py-4 rounded-xl font-bold text-white bg-piri-zelle flex items-center justify-center gap-3 transition-opacity hover:opacity-90">
            <ExternalLink className="w-5 h-5" />
            Open Zelle (find your bank)
          </button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedChain === 'cashapp' && cashtag) {
    const num = parseFloat(cashAppAmount.trim().replace(/[^0-9.]/g, ''));
    const hasValidAmount = !isNaN(num) && num > 0;
    const openCashApp = () => {
      const amountSegment = hasValidAmount ? `/${num}` : '';
      window.open(`https://cash.app/$${cashtag}${amountSegment}`, '_blank', 'noopener,noreferrer');
    };
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={handleBack} className="mb-8 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl border-2 border-piri-cashapp bg-piri-cashapp/20 flex items-center justify-center shadow-sm">
              <ChainLogo chain="cashapp" size={32} />
            </div>
            <h1 className="piri-heading text-3xl font-black mb-2">Cash App</h1>
            <p className="text-sm font-semibold piri-muted">enter amount, then open Cash App to pay</p>
          </div>
          <div className="piri-card border-2 border-piri-cashapp piri-card-cashapp rounded-xl p-4 flex items-center gap-3 mb-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold piri-muted block mb-1">Pay to</label>
              <code className="text-piri text-lg font-semibold block">${cashtag}</code>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`$${cashtag}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-4 py-2 rounded-xl font-bold text-white bg-piri-cashapp flex items-center gap-2 transition-opacity hover:opacity-90">
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <div className="rounded-xl p-6 mb-6 border-2 border-piri-cashapp piri-card-cashapp shadow-sm">
            <label className="text-xs font-bold piri-muted mb-3 block uppercase tracking-wider">Amount (optional)</label>
            <div className="flex items-center gap-2">
              <span className="text-piri text-lg">$</span>
              <input type="text" inputMode="decimal" value={cashAppAmount} onChange={(e) => setCashAppAmount(e.target.value)} placeholder="0.00"
                className="flex-1 px-4 py-3 rounded-lg border-2 border-piri focus:outline-none focus:ring-2 focus:ring-piri text-piri placeholder-piri-muted text-lg font-semibold" />
            </div>
            <p className="text-xs piri-muted mt-2">Piri pre-fills this in Cash App when you open the link</p>
          </div>
          <button onClick={openCashApp} className="w-full py-4 rounded-xl font-bold text-white bg-piri-cashapp flex items-center justify-center gap-3 transition-opacity hover:opacity-90">
            <ExternalLink className="w-5 h-5" />
            Open in Cash App
          </button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selected) {
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={handleBack} className="mb-8 flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="text-center mb-10">
            <div className={`w-16 h-16 rounded-2xl border-2 ${selected.logoBoxClass} flex items-center justify-center mx-auto mb-4 shadow-sm`}>
              <ChainLogo chain={selected.chain} size={36} />
            </div>
            <h1 className="piri-heading text-3xl font-black mb-2">Pay with {selected.label}</h1>
            <p className="text-sm font-semibold piri-muted">copy the address or connect your wallet</p>
          </div>
          <div className={`piri-card border-2 ${selected.cardClass} flex-col items-stretch mb-4 rounded-xl shadow-sm`}>
            <label className="text-xs font-bold piri-muted mb-2 block uppercase tracking-wider">{selected.label} Address</label>
            <code className="text-piri text-sm break-all leading-relaxed block mb-4 font-semibold">{selected.address}</code>
            <button onClick={() => copyAddress(selected.address)} className={`w-full py-3 rounded-xl font-bold text-white ${selected.btnClass} flex items-center justify-center gap-2 transition-opacity hover:opacity-90`}>
              {copied ? <><Check className="w-5 h-5" /> Copied</> : <><Copy className="w-5 h-5" /> Copy Address</>}
            </button>
          </div>
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-piri opacity-20" /></div>
            <div className="relative flex justify-center"><span className="bg-[var(--piri-bg)] px-4 text-sm font-semibold piri-muted">or</span></div>
          </div>
          <button onClick={() => setView('pay')} className={`w-full py-4 rounded-xl font-bold text-white ${selected.btnClass} flex items-center justify-center gap-3 transition-opacity hover:opacity-90`}>
            <Wallet className="w-5 h-5" />
            Connect Wallet & Pay
          </button>
        </div>
      </div>
    );
  }

  // ─── linktree-style menu ───
  return (
    <div className="piri-page">
      <div className="max-w-lg mx-auto px-4 py-12">
        {hasPayeePersona ? (
          <TipPayeeHeader profile={profile} />
        ) : (
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-piri-cashapp bg-piri-cream shadow-lg">
                <img
                  src="/logo/piri.png"
                  alt="Piri"
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.dataset.fallbackUsed === '1') {
                      img.style.display = 'none';
                      const next = img.nextElementSibling;
                      if (next) (next as HTMLElement).classList.remove('hidden');
                    } else {
                      img.dataset.fallbackUsed = '1';
                      img.src = '/logo/piri-heart.png';
                    }
                  }}
                />
                <span className="hidden piri-heading text-4xl font-black text-piri-cashapp" aria-hidden>P</span>
              </div>
            </div>
            <h1 className="piri-heading text-4xl font-black mb-3">Piri</h1>
            <p className="text-xl font-bold text-piri">choose a payment method</p>
          </div>
        )}

        {chains.length === 0 && !cashtag && !venmoUsername && !zelleContact && !paypalUsername ? (
          <div className="text-center py-12 rounded-2xl border-2 border-piri bg-white/50 p-8">
            <p className="text-2xl mb-2">🍧</p>
            <p className="font-bold text-piri">Piri says: no payment methods set up yet</p>
            <p className="text-sm piri-muted mt-1">Whoever shared this link can add ways to get paid in their Piri profile</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map((c) => (
              <button
                key={c.chain}
                onClick={() => handleSelect(c.chain)}
                className={`w-full p-6 rounded-xl border-2 flex items-center gap-4 transition-all hover:scale-[1.02] piri-card text-left shadow-sm ${c.cardClass}`}
              >
                <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center shrink-0 ${c.logoBoxClass}`}>
                  <ChainLogo chain={c.chain} size={36} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xl text-piri">{c.label}</div>
                  <div className="text-sm piri-muted">
                    {c.chain === 'ethereum' ? 'ETH & ERC-20' : c.chain === 'base' ? 'ETH & tokens on Base' : c.chain === 'bitcoin' ? 'Send BTC' : c.chain === 'tezos' ? 'Send XTZ' : 'SOL & SPL tokens'}
                  </div>
                </div>
              </button>
            ))}
            {cashtag && (
              <button onClick={() => handleSelect('cashapp')} className="w-full p-6 rounded-xl border-2 flex items-center gap-4 transition-all hover:scale-[1.02] piri-card piri-card-cashapp text-left shadow-sm">
                <div className="w-14 h-14 rounded-xl border-2 border-piri-cashapp bg-piri-cashapp/20 flex items-center justify-center shrink-0">
                  <ChainLogo chain="cashapp" size={36} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xl text-piri">Cash App</div>
                  <div className="text-sm piri-muted">Pay ${cashtag}</div>
                </div>
              </button>
            )}
            {venmoUsername && (
              <button onClick={() => handleSelect('venmo')} className="w-full p-6 rounded-xl border-2 flex items-center gap-4 transition-all hover:scale-[1.02] piri-card piri-card-venmo text-left shadow-sm">
                <div className="w-14 h-14 rounded-xl border-2 border-piri-venmo bg-piri-venmo/20 flex items-center justify-center shrink-0">
                  <ChainLogo chain="venmo" size={36} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xl text-piri">Venmo</div>
                  <div className="text-sm piri-muted">Pay @{venmoUsername}</div>
                </div>
              </button>
            )}
            {zelleContact && (
              <button onClick={() => handleSelect('zelle')} className="w-full p-6 rounded-xl border-2 flex items-center gap-4 transition-all hover:scale-[1.02] piri-card piri-card-zelle text-left shadow-sm">
                <div className="w-14 h-14 rounded-xl border-2 border-piri-zelle bg-piri-zelle/20 flex items-center justify-center shrink-0">
                  <ChainLogo chain="zelle" size={36} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xl text-piri">Zelle</div>
                  <div className="text-sm piri-muted truncate">Pay {zelleContact}</div>
                </div>
              </button>
            )}
            {paypalUsername && (
              <button onClick={() => handleSelect('paypal')} className="w-full p-6 rounded-xl border-2 flex items-center gap-4 transition-all hover:scale-[1.02] piri-card piri-card-paypal text-left shadow-sm">
                <div className="w-14 h-14 rounded-xl border-2 border-piri-paypal bg-piri-paypal/20 flex items-center justify-center shrink-0">
                  <ChainLogo chain="paypal" size={36} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xl text-piri">PayPal</div>
                  <div className="text-sm piri-muted">Pay paypal.me/{paypalUsername}</div>
                </div>
              </button>
            )}
          </div>
        )}

        <div className="mt-10">
          <a
            href="/"
            className="w-full py-4 rounded-2xl border-2 border-piri-cashapp bg-piri-cashapp/10 hover:bg-piri-cashapp/15 font-bold text-piri flex items-center justify-center transition-colors"
          >
            Create your own Piri profile
          </a>
          <p className="text-center text-xs font-semibold piri-muted mt-2">
            make your own QR + add your payment flavors in minutes
          </p>
        </div>

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
