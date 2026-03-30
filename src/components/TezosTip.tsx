import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { NetworkType } from '@airgap/beacon-dapp';
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, XCircle, Copy, Check } from 'lucide-react';
import ChainLogo from './ChainLogo';
import { getTezosRpcUrl } from '../lib/tezosRpc';
import { isValidTezosAddress } from '../lib/tezosAddress';
import { logClientError } from '../lib/userFacingErrors';

interface TezosTipProps {
  onBack: () => void;
  receivingAddress: string;
}

export default function TezosTip({ onBack, receivingAddress }: TezosTipProps) {
  const rpc = getTezosRpcUrl();
  const tezos = useMemo(() => (rpc ? new TezosToolkit(rpc) : null), [rpc]);
  const walletRef = useRef<BeaconWallet | null>(null);

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [txCancelled, setTxCancelled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pkh, setPkh] = useState<string | null>(null);
  const [opHash, setOpHash] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const payeeOk = useMemo(() => isValidTezosAddress(receivingAddress), [receivingAddress]);

  useEffect(() => {
    if (!tezos || !payeeOk) return;
    const w = new BeaconWallet({
      name: 'Piri Pay',
      preferredNetwork: NetworkType.MAINNET,
    });
    walletRef.current = w;
    tezos.setWalletProvider(w);
    w.client
      .getActiveAccount()
      .then((acc) => {
        if (acc?.address) {
          setPkh(acc.address);
          setConnected(true);
        }
      })
      .catch(() => {});
    return () => {
      walletRef.current = null;
    };
  }, [tezos, payeeOk]);

  const connectWallet = useCallback(async () => {
    if (!tezos || !walletRef.current) return;
    setConnecting(true);
    setError(null);
    try {
      await walletRef.current.requestPermissions();
      const a = await walletRef.current.getPKH();
      setPkh(a);
      setConnected(true);
    } catch (e) {
      logClientError('TezosTip connect', e);
      setError('Could not connect a Tezos wallet. Try Temple, Kukai, or another Beacon wallet.');
    } finally {
      setConnecting(false);
    }
  }, [tezos]);

  const handleSend = useCallback(async () => {
    const n = parseFloat(amount);
    if (!amount || Number.isNaN(n) || n <= 0) {
      setError('Enter a valid amount in XTZ.');
      return;
    }
    if (!tezos || !pkh || !payeeOk) return;
    setError(null);
    setSending(true);
    try {
      const op = await tezos.wallet.transfer({ to: receivingAddress.trim(), amount: n }).send();
      const hash = op.opHash;
      setOpHash(hash);
      await op.confirmation();
      setSuccess(true);
    } catch (e) {
      logClientError('TezosTip send', e);
      const msg = e instanceof Error ? e.message.toLowerCase() : '';
      const rejected =
        msg.includes('aborted') ||
        msg.includes('cancel') ||
        msg.includes('reject') ||
        msg.includes('denied') ||
        msg.includes('declined');
      if (rejected) {
        setTxCancelled(true);
        setError(null);
      } else {
        setError(
          msg.includes('balance') || msg.includes('Funds')
            ? 'Not enough XTZ for this amount (and fees).'
            : 'Something went wrong sending XTZ. Check your wallet and RPC, then try again.'
        );
      }
    } finally {
      setSending(false);
    }
  }, [amount, tezos, pkh, payeeOk, receivingAddress]);

  const explorerUrl = opHash ? `https://tzkt.io/${opHash}` : null;

  if (!rpc) {
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button type="button" onClick={onBack} className="mb-8 flex items-center gap-2 font-semibold text-piri hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="rounded-xl border-2 border-piri/20 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-piri">
              Set <code className="font-mono text-xs">VITE_TEZOS_RPC_URL</code> to a mainnet https rpc (e.g.{' '}
              https://mainnet.ecadinfra.com), redeploy, and reload.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!payeeOk) {
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12">
          <button type="button" onClick={onBack} className="mb-8 flex items-center gap-2 font-semibold text-piri hover:opacity-70">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <p className="text-sm text-red-600 font-semibold">This tip page has an invalid Tezos address.</p>
        </div>
      </div>
    );
  }

  if (success && opHash) {
    return (
      <div className="piri-page">
        <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="piri-heading text-2xl font-black text-emerald-600">Tip sent</h2>
          {explorerUrl ? (
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-sm piri-link font-mono break-all underline block">
              {opHash}
            </a>
          ) : (
            <p className="font-mono text-sm break-all">{opHash}</p>
          )}
          <button type="button" onClick={onBack} className="mt-6 px-6 py-3 rounded-xl piri-btn-secondary border-2 font-bold">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="piri-page">
      <div className="max-w-lg mx-auto px-4 py-12">
        <button type="button" onClick={onBack} className="mb-8 flex items-center gap-2 font-semibold text-piri hover:opacity-70">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl border-2 border-piri-tezos bg-piri-tezos/20 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ChainLogo chain="tezos" size={36} />
          </div>
          <h1 className="piri-heading text-3xl font-black mb-2">Tezos</h1>
          <p className="text-sm font-semibold piri-muted">XTZ on mainnet</p>
        </div>

        <div className="rounded-xl p-4 border-2 border-piri-tezos piri-card-tezos shadow-sm mb-6">
          <p className="text-xs font-bold piri-muted uppercase mb-2">Pay to</p>
          <code className="text-sm text-piri break-all font-semibold block">{receivingAddress.trim()}</code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(receivingAddress.trim());
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="mt-3 w-full py-2 rounded-lg font-bold text-sm bg-piri-tezos text-white flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy address'}
          </button>
          <p className="text-xs piri-muted mt-2">
            If connect fails, send XTZ to this address from any Tezos wallet using <strong>Copy address</strong>.
          </p>
        </div>

        {!connected ? (
          <button
            type="button"
            onClick={() => void connectWallet()}
            disabled={connecting}
            className="w-full py-4 rounded-xl font-bold text-white bg-piri-tezos flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Connect Beacon wallet
          </button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-3 border border-piri/15 bg-white/60 text-xs">
              <span className="piri-muted">From </span>
              <code className="font-mono text-piri break-all">{pkh}</code>
            </div>
            <div>
              <label htmlFor="tez-amt" className="block text-sm font-semibold text-piri mb-2">
                Amount (XTZ)
              </label>
              <input
                id="tez-amt"
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                  setTxCancelled(false);
                }}
                disabled={sending}
                className="w-full px-4 py-3 rounded-xl border-2 border-piri/25 text-lg font-bold text-piri"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !amount}
              className="w-full py-4 rounded-xl font-bold text-white bg-piri-tezos flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Send tip
            </button>
          </div>
        )}

        {txCancelled && (
          <div className="mt-4 flex gap-3 p-4 rounded-xl border-2 border-amber-400 bg-amber-50">
            <XCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">Cancelled in wallet — your funds are safe. Try again when ready.</p>
          </div>
        )}
        {error && (
          <div className="mt-4 flex gap-2 p-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
