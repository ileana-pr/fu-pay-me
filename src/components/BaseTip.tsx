import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect, useWaitForTransactionReceipt, useWriteContract, useBalance } from 'wagmi';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import type { EIP1193Provider } from 'viem';
import { parseEther, parseUnits, erc20Abi, Address } from 'viem';
import { ArrowLeft, Wallet, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { POPULAR_TOKENS, TokenConfig } from '../lib/popularTokens';

interface BaseTipProps {
  onBack: () => void;
  receivingAddress: string;
}

export default function BaseTip({ onBack, receivingAddress }: BaseTipProps) {
  const [selectedToken, setSelectedToken] = useState<TokenConfig | null>(null);
  const [amount, setAmount] = useState('');
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirectSending, setIsDirectSending] = useState(false);
  const { address: ethAddress, isConnected: isEthConnected, chain } = useAccount();
  const { error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect: disconnectEth } = useDisconnect();
  const { openConnectModal } = useConnectModal();

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

  useEffect(() => {
    if (!isEthConnected || !window.ethereum) return;

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
  }, [isEthConnected]);

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
      if (errorMessage.includes('user rejected')) return null;
      return errorMessage;
    }
    return null;
  }, [error, contractError, balance]);

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
      if (!errorMessage.toLowerCase().includes('user rejected') &&
          !errorMessage.toLowerCase().includes('rejected the request') &&
          !errorMessage.toLowerCase().includes('user denied')) {
        setError(errorMessage);
      }
      const timer = setTimeout(() => { resetContract(); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [contractError, resetContract, isDirectSending]);

  const handleSwitchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    setIsSwitchingNetwork(true);
    setError(null);
    try {
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
      setError('Failed to switch network. Please switch manually in MetaMask.');
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, [expectedChain]);

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

    if (window.ethereum) {
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
            const isUserRejection =
              errorMessage.toLowerCase().includes('user rejected') ||
              errorMessage.toLowerCase().includes('user denied') ||
              errorCode === 4001;
            if (!isUserRejection) {
              if (errorCode === -32603 || errorMessage.includes('Internal JSON-RPC error')) {
                setError(`MetaMask RPC Error: ${errorMessage}\n\nTry: 1. Refreshing the page 2. Switching to Base and back in MetaMask 3. Settings → Networks → Base → RPC URL 4. Reset Account (Settings → Advanced).`);
              } else {
                setError(errorMessage);
              }
            } else {
              setError(null);
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
  }, [amount, ethAddress, networkMismatch, actualChainId, expectedChain, receivingAddress, selectedToken, writeContract, lastNetworkSwitchTime]);

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
    if (isEthConnected) {
      handleSendTip();
    } else {
      setShowWalletSelector(true);
    }
  };

  const quickAmounts = ['0.001', '0.01', '0.1', '1', '10'];
  const tokens = POPULAR_TOKENS.base;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-slate-800/50 backdrop-blur-lg rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl mb-4">
              <Wallet className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Base</h2>
            <p className="text-gray-400">Your payment address is pre-filled automatically</p>
          </div>

          {!isSuccess ? (
            <div className="space-y-6">
              {!selectedToken ? (
                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-300">Select Token</label>
                  <div className="space-y-3">
                    {tokens?.native.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => setSelectedToken(token)}
                        className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
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
                        onClick={() => setSelectedToken(null)}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-300">Enter Amount ({selectedToken.symbol})</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setError(null); }}
                      placeholder="0.00"
                      disabled={isSending || isConfirming}
                      className="w-full px-6 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-2xl font-bold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
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
                        onClick={() => { setAmount(amt); setError(null); }}
                        disabled={isSending || isConfirming}
                        className="py-2 px-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showWalletSelector && !isEthConnected && (
                <div className="space-y-4 p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border-2 border-indigo-500/30 shadow-2xl backdrop-blur-sm">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">👛</div>
                    <p className="text-lg font-bold text-white">Connect Your Wallet</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openConnectModal?.()}
                    disabled={isConnecting}
                    className="w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 hover:from-indigo-600 hover:via-blue-600 hover:to-indigo-700 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-2xl">🔗</span>
                    <span>Connect wallet</span>
                    {isConnecting ? <span className="text-xs opacity-90">⏳ Connecting...</span> : <span className="text-xs opacity-90">📱 Tap to open wallet</span>}
                  </button>
                  <button
                    onClick={() => setShowWalletSelector(false)}
                    className="w-full py-2 px-4 text-gray-400 hover:text-white text-sm transition-colors rounded-lg hover:bg-slate-700/50"
                  >
                    Maybe later
                  </button>
                </div>
              )}

              {isEthConnected && !showWalletSelector && (
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-2">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Connected Wallet</p>
                    <p className="font-mono text-sm">{ethAddress?.slice(0, 6)}...{ethAddress?.slice(-4)}</p>
                  </div>
                  {currentNetwork && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Network</p>
                      <p className="text-sm font-medium">{currentNetwork}</p>
                    </div>
                  )}
                  <button onClick={() => disconnectEth()} className="text-sm text-red-400 hover:text-red-300 mt-2">Disconnect</button>
                </div>
              )}

              {networkMismatch && (
                <div className="flex flex-col gap-3 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-400 mb-1">Network Mismatch Detected</p>
                      <p className="text-sm text-yellow-300/80 mb-2">
                        Your wallet is on <strong>{currentNetwork || `Chain ${actualChainId || 'Unknown'}`}</strong>, but this app expects <strong>{expectedChain.name}</strong>.
                      </p>
                      <button
                        onClick={handleSwitchNetwork}
                        disabled={isSwitchingNetwork}
                        className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

              {formattedError && !networkMismatch && (
                <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Transaction Error</p>
                    <p className="text-sm whitespace-pre-line">{formattedError}</p>
                  </div>
                </div>
              )}

              {selectedToken && !showWalletSelector && (
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
