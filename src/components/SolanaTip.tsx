import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { POPULAR_TOKENS, TokenConfig } from '../lib/popularTokens';
import ChainLogo from './ChainLogo';

interface SolanaTipProps {
  onBack: () => void;
  receivingAddress: string;
}

export default function SolanaTip({ onBack, receivingAddress }: SolanaTipProps) {
  const [selectedToken, setSelectedToken] = useState<TokenConfig | null>(null);
  const [amount, setAmount] = useState('');
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionCancelled, setTransactionCancelled] = useState(false);
  const [isSolSending, setIsSolSending] = useState(false);
  const [solHash, setSolHash] = useState<string | null>(null);
  const [isSolSuccess, setIsSolSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Solana wallet hooks
  const { publicKey: solAddress, connected: isSolConnected, connect: connectSol, disconnect: disconnectSol, wallet, wallets, select } = useWallet();

  // detect mobile so we only show the single "Mobile Wallet Adapter" option
  useEffect(() => {
    const check = () => {
      const narrow = typeof window !== 'undefined' && window.innerWidth < 768;
      const touch = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(Boolean(narrow || touch));
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const { connection } = useConnection();

  // must match solanaConfig default
  const defaultEndpoint = 'https://solana-rpc.publicnode.com';
  const solanaNetwork = useMemo(() => {
    const endpoint = import.meta.env.VITE_SOLANA_ENDPOINT || defaultEndpoint;
    if (endpoint.includes('devnet')) return 'Devnet (Testnet)';
    if (endpoint.includes('testnet')) return 'Testnet';
    if (endpoint.includes('mainnet') || endpoint.includes('publicnode')) return 'Mainnet';
    return 'Mainnet';
  }, []);

  // Generate explorer URL
  const explorerUrl = useMemo(() => {
    if (!solHash) return null;
    const endpoint = import.meta.env.VITE_SOLANA_ENDPOINT || defaultEndpoint;
    if (endpoint.includes('devnet')) {
      return `https://explorer.solana.com/tx/${solHash}?cluster=devnet`;
    }
    if (endpoint.includes('testnet')) {
      return `https://explorer.solana.com/tx/${solHash}?cluster=testnet`;
    }
    return `https://explorer.solana.com/tx/${solHash}`;
  }, [solHash]);

  // Send transaction
  const handleSendTip = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!solAddress) {
      setError('Please connect your wallet');
      return;
    }

    if (!selectedToken) {
      setError('Please select a token');
      return;
    }

    setError(null);

    try {
      setIsSolSending(true);

      // required by Phantom/RPC: set recentBlockhash and feePayer before sending
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new Transaction();

      if (selectedToken.contractAddress === 'native') {
        // Native SOL transfer
        const recipientPubkey = new PublicKey(receivingAddress);
        const amountLamports = parseFloat(amount) * LAMPORTS_PER_SOL;
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: solAddress,
            toPubkey: recipientPubkey,
            lamports: amountLamports,
          })
        );
      } else {
        // SPL token transfer
        const mintPubkey = new PublicKey(selectedToken.contractAddress);
        const recipientPubkey = new PublicKey(receivingAddress);
        const senderTokenAccount = await getAssociatedTokenAddress(mintPubkey, solAddress);
        const recipientTokenAccount = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);
        const amountInSmallestUnit = BigInt(parseFloat(amount) * Math.pow(10, selectedToken.decimals));
        transaction.add(
          createTransferInstruction(
            senderTokenAccount,
            recipientTokenAccount,
            solAddress,
            amountInSmallestUnit
          )
        );
      }

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = solAddress;

      const signature = await wallet?.adapter.sendTransaction(transaction, connection);
      setSolHash(signature || null);

      if (signature) {
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
        setIsSolSuccess(true);
      }

      setIsSolSending(false);
    } catch (err: unknown) {
      console.error('Error sending tip:', err);
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      const m = errorMessage.toLowerCase();
      const isRejection = m.includes('user rejected') || m.includes('rejected') || m.includes('denied') ||
        m.includes('cancelled') || m.includes('canceled') || m.includes('declined');
      if (isRejection) {
        setTransactionCancelled(true);
        setError(null);
      } else {
        setError(errorMessage);
      }
      setIsSolSending(false);
    }
  }, [amount, solAddress, selectedToken, receivingAddress, wallet, connection]);

  // Auto-send when wallet connects
  useEffect(() => {
    if (isSolConnected && amount && showWalletSelector && selectedToken) {
      handleSendTip();
      setShowWalletSelector(false);
    }
  }, [isSolConnected, amount, showWalletSelector, selectedToken, handleSendTip]);

  const handleTipClick = () => {
    if (!selectedToken) {
      setError('Please select a token');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError(null);
    setTransactionCancelled(false);

    if (isSolConnected) {
      handleSendTip();
    } else {
      setShowWalletSelector(true);
    }
  };

  const handleStartOver = () => {
    setTransactionCancelled(false);
    setError(null);
  };

  const handleConnectWallet = (walletName: string) => {
    const selectedWallet = wallets.find(w => w.adapter.name === walletName);
    if (selectedWallet) {
      select(selectedWallet.adapter.name);
      setTimeout(() => {
        connectSol();
      }, 100);
    }
  };

  const quickAmounts = ['0.1', '0.5', '1', '5', '10'];
  const tokens = POPULAR_TOKENS.solana;

  // wallets to show in the connect list (exclude eth; on mobile only Mobile Wallet Adapter)
  const solanaWalletsToShow = useMemo(() => {
    const seen = new Set<string>();
    let list = wallets.filter((w) => {
      const name = w.adapter.name.toLowerCase();
      if (name.includes('metamask') || name.includes('ethereum') || name.includes('walletconnect') || name.includes('injected')) return false;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
    if (isMobile) {
      list = list.filter((w) => w.adapter.name.toLowerCase().includes('mobile wallet adapter'));
    }
    return list;
  }, [wallets, isMobile]);

  return (
    <div className="piri-page">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-semibold text-piri transition-opacity hover:opacity-70 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="rounded-3xl p-8 border-2 border-piri-solana piri-card-solana shadow-xl backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border-2 border-piri-solana bg-piri-solana/20 mb-4 shadow-sm">
              <ChainLogo chain="solana" size={40} />
            </div>
            <h2 className="piri-heading text-3xl font-black mb-2">Solana</h2>
            <p className="text-sm piri-muted font-semibold">Your payment address is pre-filled automatically</p>
          </div>

          {!isSolSuccess ? (
            <div className="space-y-6">
              {/* Token selection */}
              {!selectedToken ? (
                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-300">
                    Select Token
                  </label>
                  <div className="space-y-3">
                    {tokens?.native.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => setSelectedToken(token)}
                        className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                      >
                        {token.symbol} - {token.name}
                      </button>
                    ))}
                    {tokens?.tokens.map((token) => (
                      <button
                        key={token.contractAddress}
                        onClick={() => setSelectedToken(token)}
                        className="w-full py-3 px-6 bg-slate-700/50 hover:bg-slate-700 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                      >
                        {token.symbol} - {token.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Selected token display */}
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Selected Token</p>
                        <p className="text-xl font-bold">{selectedToken.symbol} - {selectedToken.name}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedToken(null); setTransactionCancelled(false); }}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Amount input */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-300">
                      Enter Amount ({selectedToken.symbol})
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setError(null);
                        setTransactionCancelled(false);
                      }}
                      placeholder="0.00"
                      disabled={isSolSending}
                      className="w-full px-6 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-2xl font-bold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {selectedToken && (
                <div>
                  <p className="text-sm text-gray-400 mb-3">Quick amounts</p>
                  <div className="grid grid-cols-5 gap-2">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          setAmount(amt);
                          setError(null);
                          setTransactionCancelled(false);
                        }}
                        disabled={isSolSending}
                        className="py-2 px-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wallet selector */}
              {showWalletSelector && !isSolConnected && (
                <div className="space-y-4 p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border-2 border-purple-500/30 shadow-2xl backdrop-blur-sm">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">👛</div>
                    <p className="text-lg font-bold text-white mb-1">Connect Your Wallet</p>
                    <p className="text-sm text-gray-400">Choose your favorite Solana wallet!</p>
                  </div>
                  {solanaWalletsToShow.length > 0 ? (
                    <div className="space-y-3">
                      {solanaWalletsToShow.map((wallet) => {
                          const readyState = wallet.adapter.readyState;
                          const canConnect = readyState === 'Installed' || readyState === 'Loadable';
                          const walletName = wallet.adapter.name.toLowerCase();
                          const isMobileAdapter = walletName.includes('mobile wallet adapter');
                          const displayName = isMobileAdapter ? 'Open wallet app' : wallet.adapter.name;
                          const walletIcon = walletName.includes('phantom') ? '👻' :
                                           walletName.includes('solflare') ? '🔥' : '💜';
                          const statusEmoji = canConnect ? '✨' : '⏳';
                          const statusText = isMobileAdapter
                            ? (canConnect ? 'Ready to connect!' : `(${readyState})`)
                            : (canConnect ? `${statusEmoji} Ready!` : `(${readyState})`);

                          return (
                            <button
                              key={wallet.adapter.name}
                              onClick={() => handleConnectWallet(wallet.adapter.name)}
                              className={`group w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                                canConnect
                                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 text-white'
                                  : 'bg-slate-700/50 hover:bg-slate-700 text-gray-400 hover:text-gray-300'
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <span className="text-2xl">{walletIcon}</span>
                                <span>{displayName}</span>
                              </span>
                              <span className="text-xs opacity-90">{statusText}</span>
                            </button>
                          );
                      })}
                      <p className="text-xs text-gray-500 text-center mt-3">
                        Found {solanaWalletsToShow.length} Solana wallet{solanaWalletsToShow.length !== 1 ? 's' : ''} 🎉
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-5xl mb-3">😢</div>
                      <p className="text-gray-300 mb-2">No wallets found</p>
                      <p className="text-sm text-gray-400 mb-4">Install a Solana wallet to get started!</p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <a
                          href="https://phantom.app/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          Phantom
                        </a>
                        <a
                          href="https://backpack.app/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm font-medium transition-colors"
                        >
                          Backpack
                        </a>
                        <a
                          href="https://glow.app/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm font-medium transition-colors"
                        >
                          Glow
                        </a>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setShowWalletSelector(false)}
                    className="w-full py-2 px-4 text-gray-400 hover:text-white text-sm transition-colors rounded-lg hover:bg-slate-700/50"
                  >
                    Maybe later
                  </button>
                </div>
              )}

              {/* Connected wallet info */}
              {isSolConnected && !showWalletSelector && (
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-2">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Connected Wallet</p>
                    <p className="font-mono text-sm">
                      {solAddress?.toString().slice(0, 6)}...{solAddress?.toString().slice(-4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Network</p>
                    <p className="text-sm font-medium">Solana {solanaNetwork}</p>
                  </div>
                  <button
                    onClick={() => disconnectSol()}
                    className="text-sm text-red-400 hover:text-red-300 mt-2"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* Error messages */}
              {transactionCancelled && (
                <div className="flex flex-col gap-4 p-6 bg-amber-500/10 border border-amber-500/40 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-400">Transaction cancelled</p>
                      <p className="text-sm text-amber-600/90 dark:text-amber-300/80 mt-1">No worries — your funds are safe. You can try again whenever you&apos;re ready.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleStartOver}
                      className="px-4 py-2 bg-piri text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                    >
                      Start over
                    </button>
                    <button
                      onClick={onBack}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl transition-colors"
                    >
                      Go back
                    </button>
                  </div>
                </div>
              )}

              {error && !transactionCancelled && (
                <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Transaction Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Send button */}
              {selectedToken && !showWalletSelector && !transactionCancelled && (
                <button
                  onClick={handleTipClick}
                  disabled={!amount || isSolSending}
                  className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isSolSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Tip'
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-green-400">Tip Sent Successfully!</h3>
              <p className="text-gray-400">Thank you for your generous tip!</p>
              {solHash && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Transaction</p>
                  {explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-400 hover:text-purple-300 font-mono break-all underline transition-colors"
                    >
                      {solHash}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 font-mono break-all">{solHash}</p>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setAmount('');
                  setSelectedToken(null);
                  setError(null);
                  setSolHash(null);
                  setIsSolSuccess(false);
                  disconnectSol();
                }}
                className="mt-6 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
              >
                Send Another Tip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

