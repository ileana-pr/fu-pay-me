import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useConnect, useDisconnect, useConnections, useSwitchChain, useWaitForTransactionReceipt, useWriteContract, useBalance } from 'wagmi';

import ConnectChoice from './ConnectChoice';
import { base } from 'wagmi/chains';
import type { EIP1193Provider } from 'viem';
import { parseEther, parseUnits, erc20Abi, Address } from 'viem';
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { POPULAR_TOKENS, TokenConfig } from '../lib/popularTokens';
import ChainLogo from './ChainLogo';
import { BASE_ACCOUNT_CONNECTOR_ID, disconnectAllExcept } from '../lib/pruneWalletConnections';

interface BaseTipProps {
  onBack: () => void;
  receivingAddress: string;
  hasPrivy?: boolean;
}

export default function BaseTip({ onBack, receivingAddress, hasPrivy = false }: BaseTipProps) {
  const [selectedToken, setSelectedToken] = useState<TokenConfig | null>(null);
  const [amount, setAmount] = useState('');
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionCancelled, setTransactionCancelled] = useState(false);
  const [isDirectSending, setIsDirectSending] = useState(false);
  const { address: ethAddress, isConnected: isEthConnected, chain, connector } = useConnection();
  const { error: connectError, isPending: isConnecting } = useConnect();
  const { mutate: disconnectEth, mutateAsync: disconnectMutateAsync } = useDisconnect();
  const { mutateAsync: switchChainMutateAsync } = useSwitchChain();
  const connections = useConnections();

  const expectedChain = base;

  const [actualChainId, setActualChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [lastNetworkSwitchTime, setLastNetworkSwitchTime] = useState<number | null>(null);

  useEffect(() => {
    if (isEthConnected && chain?.id) {
      setActualChainId(chain.id);
    } else if (!isEthConnected) {
      setActualChainId(null);
    }
  }, [isEthConnected, chain?.id]);

  // base account + metamask both connected → chain events come from wrong provider; keep only base account
  const connectionIds = useMemo(() => connections.map((c) => c.connector.uid).join(','), [connections]);
  useEffect(() => {
    if (!isEthConnected || connector?.id !== BASE_ACCOUNT_CONNECTOR_ID || connections.length <= 1) return;
    let cancelled = false;
    (async () => {
      await disconnectAllExcept(connections, BASE_ACCOUNT_CONNECTOR_ID, disconnectMutateAsync);
      if (!cancelled && chain?.id) setActualChainId(chain.id);
    })();
    return () => { cancelled = true; };
    // connectionIds replaces connections ref equality so we re-run when set of connections changes
  }, [isEthConnected, connector?.id, connectionIds, connections, disconnectMutateAsync, chain?.id]);

  // never attach to window.ethereum when using base account — that provider is metamask and overwrites chain
  useEffect(() => {
    if (!isEthConnected || !window.ethereum) return;
    if (connector?.id === BASE_ACCOUNT_CONNECTOR_ID) return;

    const handleChainChanged = (chainId: string | number) => {
      let chainIdNum: number;
      if (typeof chainId === 'string') {
        chainIdNum = chainId.startsWith('0x') || chainId.startsWith('0X')
          ? parseInt(chainId, 16)
          : parseInt(chainId, 10);
      } else {
        chainIdNum = chainId;
      }
      setActualChainId(chainIdNum);
      setError(null);
    };

    (window.ethereum as EIP1193Provider).on('chainChanged', handleChainChanged);
    return () => {
      (window.ethereum as EIP1193Provider)?.removeListener('chainChanged', handleChainChanged);
    };
  }, [isEthConnected, connector?.id]);

  const { data: balance } = useBalance({
    address: ethAddress,
    chainId: expectedChain.id,
  });

  const [manualEthHash, setManualEthHash] = useState<`0x${string}` | undefined>(undefined);
  const { isLoading: isEthConfirming, isSuccess: isEthSuccess } = useWaitForTransactionReceipt({ hash: manualEthHash });

  const { writeContract, data: contractHash, isPending: isContractSending, error: contractError, reset: resetContract } = useWriteContract();
  const { isLoading: isContractConfirming, isSuccess: isContractSuccess } = useWaitForTransactionReceipt({ hash: contractHash });

  const currentNetwork = useMemo(() => {
    if (actualChainId) {
      if (actualChainId === 8453) return 'Base';
      return chain?.name || `Chain ${actualChainId}`;
    }
    return null;
  }, [actualChainId, chain]);

  const networkMismatch = useMemo(() => {
    if (!isEthConnected || !actualChainId) return false;
    return actualChainId !== expectedChain.id;
  }, [isEthConnected, actualChainId, expectedChain.id]);

  const isUserRejection = useCallback((msg: string, code?: number) => {
    const m = msg.toLowerCase();
    return m.includes('user rejected') || m.includes('rejected the request') || m.includes('user denied') ||
      m.includes('cancelled') || m.includes('canceled') || m.includes('action_rejected') || code === 4001;
  }, []);

  const handleStartOver = useCallback(() => {
    setTransactionCancelled(false);
    setError(null);
    resetContract();
  }, [resetContract]);

  const isSending = isContractSending || isDirectSending;
  const isConfirming = isEthConfirming || isContractConfirming;
  const isSuccess = isEthSuccess || isContractSuccess;
  const hash = manualEthHash || contractHash;

  const formattedError = useMemo(() => {
    if (error) {
      if (typeof error === 'string' && (error.includes('Internal JSON-RPC error') || error.includes('-32603'))) {
        let errorMsg = 'MetaMask RPC Error (-32603): Internal JSON-RPC error.\n\n';
        errorMsg += 'This error comes from MetaMask, not the app. Common causes:\n';
        errorMsg += '• Insufficient balance (need amount + gas fees)\n';
        errorMsg += '• MetaMask RPC endpoint issues\n';
        errorMsg += '• Gas estimation failure\n';
        errorMsg += '• Network configuration problems\n\n';
        if (balance) {
          const balanceFormatted = (Number(balance.value) / Math.pow(10, balance.decimals)).toFixed(6);
          errorMsg += `Your current balance: ${balanceFormatted} ${balance.symbol}\n\n`;
        }
        errorMsg += 'Troubleshooting steps:\n';
        errorMsg += '1. Check MetaMask → Settings → Advanced → Reset Account\n';
        errorMsg += '2. Verify you\'re on Base (chain ID: 8453)\n';
        errorMsg += '3. Refresh page and reconnect wallet\n';
        errorMsg += '4. Try a smaller amount (0.0001 instead of 0.001)\n';
        errorMsg += '5. Check MetaMask network RPC URL is correct';
        return errorMsg;
      }
      return error;
    }
    if (contractError) {
      const errorMessage = contractError.message || contractError.toString();
      if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
        return 'Insufficient balance. Please ensure you have enough tokens to cover the transaction amount and gas fees.';
      }
      if (isUserRejection(errorMessage)) return null;
      return errorMessage;
    }
    return null;
  }, [error, contractError, balance, isUserRejection]);

  const explorerUrl = useMemo(() => {
    if (!hash) return null;
    const txHash = hash as string;
    if (actualChainId === 8453) {
      return `https://basescan.org/tx/${txHash}`;
    }
    return null;
  }, [hash, actualChainId]);

  useEffect(() => {
    if (isDirectSending) return;
    if (contractError) {
      const errorMessage = contractError?.message || contractError?.toString() || 'Transaction failed';
      if (isUserRejection(errorMessage)) {
        setTransactionCancelled(true);
        setError(null);
      } else {
        setError(errorMessage);
      }
      const timer = setTimeout(() => { resetContract(); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [contractError, resetContract, isDirectSending, isUserRejection]);

  const handleSwitchNetwork = useCallback(async () => {
    setIsSwitchingNetwork(true);
    setError(null);
    try {
      // base account (and other embedded wallets) must switch via wagmi — window.ethereum is metamask
      if (connector?.id === BASE_ACCOUNT_CONNECTOR_ID && switchChainMutateAsync) {
        await switchChainMutateAsync({ chainId: expectedChain.id });
        setActualChainId(expectedChain.id);
        setLastNetworkSwitchTime(Date.now());
        return;
      }
      if (!window.ethereum) return;
      const chainIdHex = `0x${expectedChain.id.toString(16)}`;
      try {
        await (window.ethereum as EIP1193Provider).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (switchError: unknown) {
        const err = switchError as { code?: number };
        if (err.code === 4902) {
          await (window.ethereum as EIP1193Provider).request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: expectedChain.name,
              nativeCurrency: {
                name: expectedChain.nativeCurrency.name,
                symbol: expectedChain.nativeCurrency.symbol,
                decimals: expectedChain.nativeCurrency.decimals,
              },
              rpcUrls: expectedChain.rpcUrls.default.http,
              blockExplorerUrls: expectedChain.blockExplorers?.default?.url ? [expectedChain.blockExplorers.default.url] : undefined,
            }],
          });
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          throw switchError;
        }
      }
      let attempts = 0;
      const maxAttempts = 20;
      while (attempts < maxAttempts) {
        try {
          const walletChainId = await (window.ethereum as EIP1193Provider).request({ method: 'eth_chainId' });
          const walletChainIdNum = typeof walletChainId === 'string' && walletChainId.startsWith('0x')
            ? parseInt(walletChainId, 16)
            : Number(walletChainId);
          if (walletChainIdNum === expectedChain.id) {
            setLastNetworkSwitchTime(Date.now());
            setIsSwitchingNetwork(false);
            return;
          }
        } catch { /* ignore */ }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLastNetworkSwitchTime(Date.now());
    } catch (err) {
      console.error('Network switch error:', err);
      setError(connector?.id === BASE_ACCOUNT_CONNECTOR_ID
        ? 'Failed to switch network in Base Account. Try disconnecting and connecting again.'
        : 'Failed to switch network. Please switch manually in your wallet.');
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, [expectedChain, connector?.id, switchChainMutateAsync]);

  const handleSendTip = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!ethAddress) {
      setError('Please connect your wallet');
      return;
    }
    if (networkMismatch) return;
    if (!actualChainId || actualChainId !== expectedChain.id) return;

    // base account: never ping window.ethereum — that's metamask and breaks the flow
    if (connector?.id !== BASE_ACCOUNT_CONNECTOR_ID && window.ethereum) {
      try {
        await (window.ethereum as EIP1193Provider).request({ method: 'eth_blockNumber' });
      } catch {
        setError('RPC connection test failed. Please try refreshing the page.');
        return;
      }
      if (lastNetworkSwitchTime && (Date.now() - lastNetworkSwitchTime) < 10000) {
        const timeSinceSwitch = Date.now() - lastNetworkSwitchTime;
        const minWaitTime = 3000;
        const additionalDelay = Math.max(0, minWaitTime - timeSinceSwitch);
        if (additionalDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, additionalDelay));
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setError(null);

    try {
      let lowFees: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } | undefined;
      if (window.ethereum) {
        try {
          const block = await (window.ethereum as EIP1193Provider).request({
            method: 'eth_getBlockByNumber',
            params: ['latest', false],
          }) as { baseFeePerGas?: string } | null;
          const baseFeeHex = block?.baseFeePerGas;
          if (baseFeeHex) {
            const baseFee = BigInt(baseFeeHex);
            const maxPriorityFeePerGas = 1n * 10n ** 9n;
            lowFees = { maxFeePerGas: baseFee * 2n + maxPriorityFeePerGas, maxPriorityFeePerGas };
          }
        } catch { /* ignore */ }
      }

      if (!selectedToken || selectedToken.contractAddress === 'native') {
        if (window.ethereum && ethAddress) {
          try {
            const balanceHex = await (window.ethereum as EIP1193Provider).request({
              method: 'eth_getBalance',
              params: [ethAddress, 'latest'],
            });
            const balanceWei = BigInt(balanceHex);
            const amountWei = parseEther(amount);
            const minBalanceNeeded = amountWei + BigInt(21000) * BigInt(1000000000);
            if (balanceWei < minBalanceNeeded) {
              const balanceFormatted = (Number(balanceWei) / 1e18).toFixed(6);
              setError(`Insufficient balance. You have ${balanceFormatted} ETH, but need at least ${(Number(minBalanceNeeded) / 1e18).toFixed(6)} ETH (amount + gas fees).`);
              return;
            }
          } catch (balanceError) {
            console.warn('Could not check balance:', balanceError);
          }

          let metaMaskChainId: number | null = null;
          try {
            const chainIdHex = await (window.ethereum as EIP1193Provider).request({ method: 'eth_chainId' });
            metaMaskChainId = typeof chainIdHex === 'string' && chainIdHex.startsWith('0x')
              ? parseInt(chainIdHex, 16)
              : Number(chainIdHex);
          } catch (chainError) {
            console.error('Failed to get MetaMask chain ID:', chainError);
          }

          if (metaMaskChainId !== null && metaMaskChainId !== expectedChain.id) {
            const chainNames: Record<number, string> = { 8453: 'Base' };
            const currentNetworkName = chainNames[metaMaskChainId] || `Chain ${metaMaskChainId}`;
            setError(`Network mismatch: MetaMask is on ${currentNetworkName} (Chain ID: ${metaMaskChainId}), but this app requires ${expectedChain.name} (Chain ID: ${expectedChain.id}). Please switch networks in MetaMask.`);
            return;
          }

          try {
            await (window.ethereum as EIP1193Provider).request({ method: 'eth_blockNumber' });
          } catch {
            setError('RPC connection test failed. MetaMask may be having issues with the network.');
            return;
          }

          const txParams: Record<string, string> = {
            from: ethAddress,
            to: receivingAddress as Address,
            value: `0x${parseEther(amount).toString(16)}`,
          };
          if (lowFees) {
            txParams.maxPriorityFeePerGas = `0x${lowFees.maxPriorityFeePerGas.toString(16)}`;
            txParams.maxFeePerGas = `0x${lowFees.maxFeePerGas.toString(16)}`;
          }

          try {
            setIsDirectSending(true);
            const txHash = await (window.ethereum as EIP1193Provider).request({
              method: 'eth_sendTransaction',
              params: [txParams],
            }) as `0x${string}`;
            setManualEthHash(txHash);
            setIsDirectSending(false);
            setError(null);
          } catch (directError: unknown) {
            setIsDirectSending(false);
            let errorMessage = 'Transaction failed';
            let errorCode: number | undefined;
            if (directError instanceof Error) {
              errorMessage = directError.message;
            } else if (typeof directError === 'object' && directError !== null) {
              const errorObj = directError as Record<string, unknown>;
              if ('message' in errorObj) errorMessage = String(errorObj.message);
              if ('code' in errorObj) errorCode = Number(errorObj.code);
            }
            if (isUserRejection(errorMessage, errorCode)) {
              setTransactionCancelled(true);
              setError(null);
            } else {
              if (errorCode === -32603 || errorMessage.includes('Internal JSON-RPC error')) {
                setError(`MetaMask RPC Error: ${errorMessage}\n\nTry: 1. Refreshing the page 2. Switching to Base and back in MetaMask 3. Settings → Networks → Base → RPC URL 4. Reset Account (Settings → Advanced).`);
              } else {
                setError(errorMessage);
              }
            }
          }
        }
      } else {
        const amountInWei = parseUnits(amount, selectedToken.decimals);
        writeContract({
          address: selectedToken.contractAddress as Address,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [receivingAddress as Address, amountInWei],
          ...(lowFees && {
            maxFeePerGas: lowFees.maxFeePerGas,
            maxPriorityFeePerGas: lowFees.maxPriorityFeePerGas,
          }),
        });
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setError('Transaction failed. Please try again.');
    }
  }, [amount, ethAddress, networkMismatch, actualChainId, expectedChain, receivingAddress, selectedToken, writeContract, lastNetworkSwitchTime, isUserRejection, connector?.id]);

  useEffect(() => {
    if (isEthConnected && amount && showWalletSelector && selectedToken) {
      handleSendTip();
      setShowWalletSelector(false);
    }
  }, [isEthConnected, amount, showWalletSelector, selectedToken, handleSendTip]);

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
    if (isEthConnected) {
      handleSendTip();
    } else {
      setShowWalletSelector(true);
    }
  };

  const quickAmounts = ['0.001', '0.01', '0.1', '1', '10'];
  const tokens = POPULAR_TOKENS.base;

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

        <div className="rounded-3xl p-8 border-2 border-piri-base piri-card-base shadow-xl backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border-2 border-piri-base bg-piri-base/20 mb-4 shadow-sm">
              <ChainLogo chain="base" size={40} />
            </div>
            <h2 className="piri-heading text-3xl font-black mb-2">Base</h2>
            <p className="text-sm font-semibold text-slate-700">Your payment address is pre-filled automatically</p>
          </div>

          {!isSuccess ? (
            <div className="space-y-6">
              {!selectedToken ? (
                <div>
                  <label className="block text-sm font-medium mb-3 text-slate-700">Select Token</label>
                  <div className="space-y-3">
                    {tokens?.native.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => setSelectedToken(token)}
                        className="w-full py-4 px-6 rounded-xl font-semibold text-lg bg-piri-base text-white transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 hover:opacity-90"
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
                  <div>
                    <label className="block text-sm font-medium mb-3 text-slate-700">Enter Amount ({selectedToken.symbol})</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setError(null); setTransactionCancelled(false); }}
                      placeholder="0.00"
                      disabled={isSending || isConfirming}
                      className="w-full px-6 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-2xl font-bold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {selectedToken && (
                <div>
                  <p className="text-sm mb-3" style={{ color: 'var(--piri-text)', opacity: 0.5 }}>Quick amounts</p>
                  <div className="grid grid-cols-5 gap-2">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => { setAmount(amt); setError(null); setTransactionCancelled(false); }}
                        disabled={isSending || isConfirming}
                        className="py-2 px-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 border-2 bg-piri-base/8 border-piri-base/25 hover:bg-piri-base/15 text-[#2D0A00]"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showWalletSelector && !isEthConnected && (
                <div className="space-y-4 p-6 rounded-2xl border-2 shadow-lg bg-piri-base/10 border-piri-base/35 backdrop-blur-sm">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">👛</div>
                    <p className="text-lg font-bold text-[#2D0A00]">Connect to send</p>
                    <p className="text-sm text-[#2D0A00]/70 mt-1">choose Privy (new to crypto) or your wallet</p>
                  </div>
                  <ConnectChoice hasPrivy={hasPrivy} variant="compact" isConnecting={isConnecting} />
                  <button
                    onClick={() => setShowWalletSelector(false)}
                    className="w-full py-2 px-4 text-sm transition-colors rounded-lg text-[#2D0A00]/50 hover:text-[#2D0A00] hover:bg-piri-base/10"
                  >
                    Maybe later
                  </button>
                </div>
              )}

              {isEthConnected && !showWalletSelector && (
                <div className="rounded-xl p-4 border-2 space-y-2 bg-white/85 border-piri-base/30">
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--piri-text)', opacity: 0.5 }}>Connected Wallet</p>
                    <p className="font-mono text-sm font-semibold text-[#2D0A00]">{ethAddress?.slice(0, 6)}...{ethAddress?.slice(-4)}</p>
                  </div>
                  {currentNetwork && (
                    <div>
                      <p className="text-sm mb-1" style={{ color: 'var(--piri-text)', opacity: 0.5 }}>Network</p>
                      <p className="text-sm font-bold text-[#2D0A00]">{currentNetwork}</p>
                    </div>
                  )}
                  <button onClick={() => disconnectEth()} className="text-sm font-semibold text-red-600 hover:text-red-700 mt-2">Disconnect</button>
                </div>
              )}

              {networkMismatch && (
                <div className="flex flex-col gap-3 p-4 rounded-xl border-2 bg-[#FFF8EE] border-piri-base/45">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-piri-base flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-black mb-1 text-[#2D0A00]" style={{ fontFamily: 'var(--piri-font-display)' }}>Network Mismatch</p>
                      <p className="text-sm text-[#2D0A00]/85 mb-2 leading-relaxed">
                        Your wallet is on <strong className="text-[#2D0A00]">{currentNetwork || `Chain ${actualChainId || 'Unknown'}`}</strong>, but this flow expects <strong className="text-[#2D0A00]">{expectedChain.name}</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={handleSwitchNetwork}
                        disabled={isSwitchingNetwork}
                        className="w-full min-h-[44px] py-3 px-4 touch-manipulation bg-piri-base hover:opacity-90 active:opacity-95 text-white font-bold rounded-xl transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSwitchingNetwork ? 'Switching...' : `Switch to ${expectedChain.name}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {connectError && (
                <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Connection Error</p>
                    <p className="text-sm">{connectError.message || String(connectError)}</p>
                  </div>
                </div>
              )}

              {transactionCancelled && (
                <div className="flex flex-col gap-4 p-6 rounded-2xl border-2 bg-amber-100 border-amber-400 shadow-sm">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: 'var(--piri-ethereum)' }} aria-hidden={true} />
                    <div>
                      <p className="font-black text-lg leading-tight" style={{ color: 'var(--piri-ethereum)', fontFamily: 'var(--piri-font-display)' }}>Transaction cancelled</p>
                      <p className="text-sm font-semibold mt-2 leading-relaxed" style={{ color: 'var(--piri-ethereum)' }}>
                        No worries — your funds are safe. You can try again whenever you&apos;re ready.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleStartOver}
                      className="px-4 py-2 bg-piri-base text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                    >
                      Start over
                    </button>
                    <button
                      onClick={onBack}
                      className="px-4 py-2 rounded-xl font-bold border-2 transition-colors bg-white/90 hover:bg-white"
                      style={{ borderColor: 'var(--piri-ethereum)', color: 'var(--piri-ethereum)' }}
                    >
                      Go back
                    </button>
                  </div>
                </div>
              )}

              {formattedError && !networkMismatch && !transactionCancelled && (
                <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Transaction Error</p>
                    <p className="text-sm whitespace-pre-line">{formattedError}</p>
                  </div>
                </div>
              )}

              {selectedToken && !showWalletSelector && !transactionCancelled && (
                <button
                  onClick={handleTipClick}
                  disabled={!amount || isSending || isConfirming || networkMismatch || isSwitchingNetwork}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isSending || isConfirming ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />{isSending ? 'Sending...' : 'Confirming...'}</>
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
              {hash && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Transaction</p>
                  {explorerUrl ? (
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 font-mono break-all underline transition-colors">
                      {hash}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 font-mono break-all">{hash}</p>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setAmount('');
                  setSelectedToken(null);
                  setError(null);
                  setManualEthHash(undefined);
                  disconnectEth();
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
