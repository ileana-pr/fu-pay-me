import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useWriteContract, useBalance } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { parseEther, parseUnits, erc20Abi, Address } from 'viem';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { ArrowLeft, Wallet, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { POPULAR_TOKENS, TokenConfig } from '../lib/popularTokens';
import QRCode from 'qrcode';

type Blockchain = 'ethereum' | 'solana' | 'bitcoin';

interface UniversalCryptoTipProps {
  onBack: () => void;
}

export default function UniversalCryptoTip({ onBack }: UniversalCryptoTipProps) {
  const [selectedBlockchain, setSelectedBlockchain] = useState<Blockchain | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenConfig | null>(null);
  const [amount, setAmount] = useState('');
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [btcQrCode, setBtcQrCode] = useState('');
  const [isDirectSending, setIsDirectSending] = useState(false);

  // get receiving addresses from env
  const receivingAddresses = useMemo(() => ({
    ethereum: import.meta.env.VITE_ETH_ADDRESS || '',
    solana: import.meta.env.VITE_SOL_ADDRESS || '',
    bitcoin: import.meta.env.VITE_BTC_ADDRESS || '',
  }), []);

  // ethereum wallet hooks
  const { address: ethAddress, isConnected: isEthConnected, chain } = useAccount();
  const { connectors, connect: connectEth } = useConnect();
  const { disconnect: disconnectEth } = useDisconnect();
  
  // map blockchain selection to expected chain
  const expectedChain = useMemo(() => {
    if (selectedBlockchain === 'ethereum') return sepolia;
    return null;
  }, [selectedBlockchain]);
  
  // get actual chain ID from wallet provider (most reliable method)
  const [actualChainId, setActualChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [lastNetworkSwitchTime, setLastNetworkSwitchTime] = useState<number | null>(null);
  
  // sync with wagmi's chain.id when it updates (primary source)
  useEffect(() => {
    if (isEthConnected && chain?.id) {
      setActualChainId(chain.id);
      console.log('Wagmi chain.id updated:', chain.id, 'Expected:', expectedChain?.id);
    } else if (!isEthConnected) {
      setActualChainId(null);
    }
  }, [isEthConnected, chain?.id, expectedChain?.id]);

  // listen to direct wallet chain change events (fires immediately when user switches)
  useEffect(() => {
    if (!isEthConnected || !window.ethereum) {
      return;
    }

    // listen for chain changes - MetaMask sends hex string
    // this fires immediately when user switches networks in wallet
    const handleChainChanged = (chainId: string | number) => {
      console.log('Chain changed event received (raw):', chainId);
      // handle both hex string (0x...) and number formats
      let chainIdNum: number;
      if (typeof chainId === 'string') {
        // if it's a hex string, parse it
        if (chainId.startsWith('0x') || chainId.startsWith('0X')) {
          chainIdNum = parseInt(chainId, 16);
        } else {
          // if it's already a decimal string, parse as decimal
          chainIdNum = parseInt(chainId, 10);
        }
      } else {
        // if it's already a number, use it directly
        chainIdNum = chainId;
      }
      // always update immediately when event fires (don't wait for wagmi)
      console.log('Chain changed to (parsed):', chainIdNum);
      setActualChainId(chainIdNum);
      // clear any errors when chain changes
      setError(null);
    };
    
    // only listen to chainChanged (networkChanged is deprecated)
    window.ethereum.on('chainChanged', handleChainChanged);
    
    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [isEthConnected]);
  
  const { data: balance } = useBalance({ 
    address: ethAddress,
    chainId: expectedChain?.id,
  });
  const { data: ethHash, isPending: isEthSending, error: ethSendError, reset: resetEthTransaction } = useSendTransaction();
  // manual hash state for direct MetaMask sends
  const [manualEthHash, setManualEthHash] = useState<`0x${string}` | null>(null);
  // use manual hash if available, otherwise use wagmi's hash
  const effectiveEthHash = manualEthHash || ethHash;
  const { isLoading: isEthConfirming, isSuccess: isEthSuccess } = useWaitForTransactionReceipt({ hash: effectiveEthHash });
  const { writeContract, data: contractHash, isPending: isContractSending, error: contractError, reset: resetContract } = useWriteContract();
  const { isLoading: isContractConfirming, isSuccess: isContractSuccess } = useWaitForTransactionReceipt({ hash: contractHash });

  // solana wallet hooks
  const { publicKey: solAddress, connected: isSolConnected, connect: connectSol, disconnect: disconnectSol, wallet, wallets, select } = useWallet();
  const { connection } = useConnection();
  const [isSolSending, setIsSolSending] = useState(false);
  const [solHash, setSolHash] = useState<string | null>(null);
  const [isSolSuccess, setIsSolSuccess] = useState(false);

  const isEVM = selectedBlockchain === 'ethereum';
  const isSol = selectedBlockchain === 'solana';
  const isBtc = selectedBlockchain === 'bitcoin';
  const isConnected = isEVM ? isEthConnected : isSolConnected;
   
  // detect solana network from endpoint
  const solanaNetwork = useMemo(() => {
    const endpoint = import.meta.env.VITE_SOLANA_ENDPOINT || 'https://api.devnet.solana.com';
    if (endpoint.includes('devnet')) return 'Devnet (Testnet)';
    if (endpoint.includes('testnet')) return 'Testnet';
    if (endpoint.includes('mainnet')) return 'Mainnet';
    return 'Unknown';
  }, []);
  
  // format network name for display - use actual chain ID to determine network
  // actualChainId is set via useEffect from wallet provider (most reliable)
  const currentNetwork = useMemo(() => {
    if (isEVM && actualChainId) {
      // map chain IDs to network names
      // sepolia = 11155111, ethereum mainnet = 1
      let networkName = 'Unknown Network';
      if (actualChainId === 11155111) networkName = 'Sepolia (Testnet)';
      else if (actualChainId === 1) networkName = 'Ethereum (Mainnet)';
      else {
        // fallback to chain name if available
        networkName = chain?.name || `Chain ${actualChainId}`;
        const isTestnet = networkName.toLowerCase().includes('testnet') || 
                         networkName.toLowerCase().includes('sepolia') ||
                         networkName.toLowerCase().includes('fuji');
        networkName = `${networkName}${isTestnet ? ' (Testnet)' : ' (Mainnet)'}`;
      }
      return networkName;
    }
    if (isSol) {
      return `Solana ${solanaNetwork}`;
    }
    return null;
  }, [isEVM, isSol, actualChainId, chain, solanaNetwork]);
  
  // check if wallet network matches expected network
  const networkMismatch = useMemo(() => {
    if (!isEVM || !isConnected || !expectedChain) return false;
    
    // use actualChainId as the source of truth
    if (!actualChainId) {
      console.log('Network mismatch check: No actualChainId available');
      return false; // no chain info available
    }
    
    // check if current chain matches expected chain
    const isMismatch = actualChainId !== expectedChain.id;
    console.log('Network mismatch check:', {
      actualChainId,
      expectedChainId: expectedChain.id,
      expectedChainName: expectedChain.name,
      isMismatch
    });
    
    return isMismatch;
  }, [isEVM, isConnected, actualChainId, expectedChain]);
  const isSending = isEVM ? (isEthSending || isContractSending || isDirectSending) : isSolSending;
  const isConfirming = isEVM ? (isEthConfirming || isContractConfirming) : false;
  const isSuccess = isEVM ? (isEthSuccess || isContractSuccess) : isSolSuccess;
  const hash = isEVM ? (effectiveEthHash || contractHash) : solHash;
  const sendError = isEVM ? (ethSendError || contractError) : null;
  
  // format error message for better user experience
  const formattedError = useMemo(() => {
    // check both error state and sendError from wagmi hooks
    if (error) {
      // if error is a string, use it directly; otherwise format it
      if (typeof error === 'string') {
        // check if it's the Internal JSON-RPC error pattern
        if (error.includes('Internal JSON-RPC error') || error.includes('-32603')) {
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
          errorMsg += '2. Verify you\'re on Sepolia Testnet (chain ID: 11155111)\n';
          errorMsg += '3. Refresh page and reconnect wallet\n';
          errorMsg += '4. Try a smaller amount (0.0001 instead of 0.001)\n';
          errorMsg += '5. Check MetaMask network RPC URL is correct';
          return errorMsg;
        }
        return error;
      }
    }
    
    if (!sendError) return null;
    
    const errorMessage = sendError.message || sendError.toString();
    const errorCode = 'code' in sendError ? (sendError as { code?: number }).code : undefined;
    
    // parse common error patterns
    if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
      return 'Insufficient balance. Please ensure you have enough tokens to cover the transaction amount and gas fees.';
    }
    if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
      return 'Transaction was rejected. Please try again if you want to proceed.';
    }
    if (errorMessage.includes('Internal JSON-RPC error') || errorCode === -32603) {
      // check if sending to yourself (same from/to address)
      if (errorMessage.includes('from:') && errorMessage.includes('to:') && 
          errorMessage.match(/from:\s*0x[\da-fA-F]+/)?.[0] === errorMessage.match(/to:\s*0x[\da-fA-F]+/)?.[0]) {
        return 'Cannot send to yourself. The receiving address matches your wallet address. Please update VITE_ETH_ADDRESS in your .env file with a different address.';
      }
      // provide more specific error message with balance info
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
      errorMsg += '2. Verify you\'re on Polygon Amoy Testnet (chain ID: 80002)\n';
      errorMsg += '3. Refresh page and reconnect wallet\n';
      errorMsg += '4. Try a smaller amount (0.0001 instead of 0.001)\n';
      errorMsg += '5. Check MetaMask network RPC URL is correct';
      
      return errorMsg;
    }
    if (errorMessage.includes('network') || errorMessage.includes('Network')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (errorMessage.includes('nonce') || errorMessage.includes('Nonce')) {
      return 'Transaction nonce error. Please try again in a moment.';
    }
    
    // return original message if no pattern matches
    return errorMessage;
  }, [error, sendError, balance]);
  
  // generate explorer URL for transaction
  const explorerUrl = useMemo(() => {
    if (!hash) return null;
    
    if (isSol) {
      // solana explorer
      const endpoint = import.meta.env.VITE_SOLANA_ENDPOINT || 'https://api.devnet.solana.com';
      if (endpoint.includes('devnet')) {
        return `https://explorer.solana.com/tx/${hash}?cluster=devnet`;
      }
      if (endpoint.includes('testnet')) {
        return `https://explorer.solana.com/tx/${hash}?cluster=testnet`;
      }
      return `https://explorer.solana.com/tx/${hash}`;
    }
    
    if (isEVM && chain) {
      // evm chain explorers
      const chainId = chain.id;
      const txHash = hash as string;
      
      // ethereum sepolia
      if (chainId === 11155111) {
        return `https://sepolia.etherscan.io/tx/${txHash}`;
      }
      // ethereum mainnet
      if (chainId === 1) {
        return `https://etherscan.io/tx/${txHash}`;
      }
      // base sepolia
      if (chainId === 84532) {
        return `https://sepolia.basescan.org/tx/${txHash}`;
      }
      // base mainnet
      if (chainId === 8453) {
        return `https://basescan.org/tx/${txHash}`;
      }
      // arbitrum sepolia
      if (chainId === 421614) {
        return `https://sepolia.arbiscan.io/tx/${txHash}`;
      }
      // arbitrum mainnet
      if (chainId === 42161) {
        return `https://arbiscan.io/tx/${txHash}`;
      }
      // optimism sepolia
      if (chainId === 11155420) {
        return `https://sepolia-optimistic.etherscan.io/tx/${txHash}`;
      }
      // optimism mainnet
      if (chainId === 10) {
        return `https://optimistic.etherscan.io/tx/${txHash}`;
      }
      // avalanche fuji
      if (chainId === 43113) {
        return `https://testnet.snowtrace.io/tx/${txHash}`;
      }
      // avalanche mainnet
      if (chainId === 43114) {
        return `https://snowtrace.io/tx/${txHash}`;
      }
      // bsc testnet
      if (chainId === 97) {
        return `https://testnet.bscscan.com/tx/${txHash}`;
      }
      // bsc mainnet
      if (chainId === 56) {
        return `https://bscscan.com/tx/${txHash}`;
      }
      // fantom testnet
      if (chainId === 4002) {
        return `https://testnet.ftmscan.com/tx/${txHash}`;
      }
      // fantom mainnet
      if (chainId === 250) {
        return `https://ftmscan.com/tx/${txHash}`;
      }
      // zksync sepolia
      if (chainId === 300) {
        return `https://sepolia.explorer.zksync.io/tx/${txHash}`;
      }
      // zksync mainnet
      if (chainId === 324) {
        return `https://explorer.zksync.io/tx/${txHash}`;
      }
      // linea sepolia
      if (chainId === 59141) {
        return `https://sepolia.lineascan.build/tx/${txHash}`;
      }
      // linea mainnet
      if (chainId === 59144) {
        return `https://lineascan.build/tx/${txHash}`;
      }
      // scroll sepolia
      if (chainId === 534351) {
        return `https://sepolia.scrollscan.com/tx/${txHash}`;
      }
      // scroll mainnet
      if (chainId === 534352) {
        return `https://scrollscan.com/tx/${txHash}`;
      }
      // mantle sepolia
      if (chainId === 5003) {
        return `https://sepolia.explorer.mantle.xyz/tx/${txHash}`;
      }
      // mantle mainnet
      if (chainId === 5000) {
        return `https://explorer.mantle.xyz/tx/${txHash}`;
      }
      // blast sepolia
      if (chainId === 168587773) {
        return `https://sepolia.blastscan.io/tx/${txHash}`;
      }
      // blast mainnet
      if (chainId === 81457) {
        return `https://blastscan.io/tx/${txHash}`;
      }
    }
    
    // fallback: try to use actualChainId if chain object not available
    if (isEVM && actualChainId && hash) {
      // ethereum sepolia
      if (actualChainId === 11155111) {
        return `https://sepolia.etherscan.io/tx/${hash}`;
      }
      // ethereum mainnet
      if (actualChainId === 1) {
        return `https://etherscan.io/tx/${hash}`;
      }
    }
    
    return null;
  }, [hash, isSol, isEVM, chain, actualChainId]);
  
  // handle transaction errors and reset state
  // only handle errors from wagmi hooks if we're not doing a direct send
  useEffect(() => {
    // ignore wagmi errors if we're doing a direct MetaMask send
    // (direct sends handle their own errors)
    if (isDirectSending) return;
    
    if (ethSendError || contractError) {
      const error = ethSendError || contractError;
      if (!error) return;
      
      const errorMessage = error?.message || error?.toString() || 'Transaction failed';
      
      // log full error details for debugging
      console.error('Transaction error details:', {
        error,
        message: errorMessage,
        code: 'code' in error ? (error as { code?: number }).code : undefined,
        cause: 'cause' in error ? (error as { cause?: unknown }).cause : undefined,
        shortMessage: 'shortMessage' in error ? (error as { shortMessage?: string }).shortMessage : undefined,
        stack: 'stack' in error ? (error as { stack?: string }).stack : undefined,
        requestArgs: 'request' in error && typeof (error as { request?: unknown }).request === 'object' 
          ? (error as { request?: { method?: string; params?: unknown } }).request 
          : undefined,
      });
      
      // try to extract more details from the error
      if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>;
        if (errorObj.request) {
          console.error('Failed request details:', errorObj.request);
        }
        if (errorObj.cause && typeof errorObj.cause === 'object') {
          const cause = errorObj.cause as Record<string, unknown>;
          console.error('Error cause details:', {
            message: cause.message,
            code: cause.code,
            data: cause.data,
          });
        }
      }
      
      // set error message for user (unless it's just a user rejection)
      if (!errorMessage.toLowerCase().includes('user rejected') && 
          !errorMessage.toLowerCase().includes('rejected the request') &&
          !errorMessage.toLowerCase().includes('user denied')) {
        setError(errorMessage);
      }
      
      // reset transaction state after a delay
      const timer = setTimeout(() => {
        if (ethSendError) resetEthTransaction();
        if (contractError) resetContract();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [ethSendError, contractError, resetEthTransaction, resetContract, isDirectSending]);
  
  // timeout for stuck transactions (30 seconds)
  useEffect(() => {
    if (isSending && !isConfirming) {
      const timer = setTimeout(() => {
        if (isEthSending) {
          setError('Transaction is taking too long. Please check your wallet or try again.');
          resetEthTransaction();
        }
        if (isContractSending) {
          setError('Transaction is taking too long. Please check your wallet or try again.');
          resetContract();
        }
      }, 30000); // 30 second timeout
      return () => clearTimeout(timer);
    }
  }, [isSending, isConfirming, isEthSending, isContractSending, resetEthTransaction, resetContract]);

  // generate bitcoin QR code
  const generateBtcQR = useCallback(async () => {
    if (!receivingAddresses.bitcoin || !amount) return;
    try {
      const btcUri = `bitcoin:${receivingAddresses.bitcoin}?amount=${amount}`;
      const qr = await QRCode.toDataURL(btcUri, { width: 300 });
      setBtcQrCode(qr);
    } catch (error) {
      console.error('Error generating BTC QR:', error);
    }
  }, [receivingAddresses.bitcoin, amount]);

  const handleSendTip = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!selectedBlockchain) {
      setError('Please select a blockchain');
      return;
    }

    // prevent transaction if network mismatch
    // don't set error here - the network mismatch warning banner already handles this
    if (networkMismatch) {
      return;
    }

    const recipientAddress = receivingAddresses[selectedBlockchain];
    if (!recipientAddress) {
      setError('No receiving address configured for this blockchain');
      return;
    }

    // prevent sending to yourself
    if (isEVM && ethAddress && recipientAddress.toLowerCase() === ethAddress.toLowerCase()) {
      setError('Cannot send to yourself. Please configure a different receiving address in your .env file.');
      return;
    }
    if (isSol && solAddress && recipientAddress === solAddress.toString()) {
      setError('Cannot send to yourself. Please configure a different receiving address in your .env file.');
      return;
    }

    setError(null);

    try {
      if (isEVM) {
        // ethereum/polygon transaction
        if (!ethAddress) {
          setError('Please connect your wallet');
          return;
        }

        // explicit chain validation before sending
        if (!expectedChain) {
          setError('Network configuration error. Please refresh the page.');
          return;
        }
        
        // don't set error for network mismatch - the yellow warning banner already handles this
        // just return early to prevent transaction
        if (!actualChainId || actualChainId !== expectedChain.id) {
          return;
        }
        
        // verify RPC connection is ready before sending (prevents RPC errors)
        // this ensures wagmi has had time to sync after network switch
        if (window.ethereum) {
          let rpcReady = false;
          let rpcAttempts = 0;
          const maxRpcAttempts = 10; // 1 second max wait
          
          while (!rpcReady && rpcAttempts < maxRpcAttempts) {
            try {
              // verify wallet chain ID matches
              const walletChainId = await window.ethereum.request({ method: 'eth_chainId' });
              const walletChainIdNum = typeof walletChainId === 'string' && walletChainId.startsWith('0x') 
                ? parseInt(walletChainId, 16) 
                : Number(walletChainId);
              
              if (walletChainIdNum === expectedChain.id) {
                // test RPC connection with a simple call
                await window.ethereum.request({ method: 'eth_blockNumber' });
                console.log('RPC connection verified before sending transaction');
                rpcReady = true;
              } else {
                console.warn('Wallet chain ID mismatch, waiting...', { walletChainIdNum, expectedChainId: expectedChain.id });
              }
            } catch (rpcError) {
              console.warn('RPC connection test failed, waiting...', rpcError);
            }
            
            if (!rpcReady) {
              await new Promise(resolve => setTimeout(resolve, 100));
              rpcAttempts++;
            }
          }
          
          if (!rpcReady) {
            console.warn('RPC verification timeout, but proceeding with transaction...');
          }
          
          // if we recently switched networks (within last 10 seconds), add extra delay
          // this gives wagmi time to fully update its internal RPC provider
          if (lastNetworkSwitchTime && (Date.now() - lastNetworkSwitchTime) < 10000) {
            const timeSinceSwitch = Date.now() - lastNetworkSwitchTime;
            // wait at least 3 seconds total after network switch before allowing transaction
            const minWaitTime = 3000;
            const additionalDelay = Math.max(0, minWaitTime - timeSinceSwitch);
            if (additionalDelay > 0) {
              console.log(`Recently switched networks (${Math.round(timeSinceSwitch)}ms ago), waiting ${additionalDelay}ms for wagmi to fully sync RPC provider...`);
              await new Promise(resolve => setTimeout(resolve, additionalDelay));
            } else {
              console.log(`Network switch was ${Math.round(timeSinceSwitch)}ms ago, sufficient time has passed`);
            }
          } else {
            // even if we didn't just switch, add a small delay to ensure RPC is stable
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // check if native token or ERC20
        if (!selectedToken || selectedToken.contractAddress === 'native') {
          // native token transfer (ETH/MATIC)
          // verify balance directly from MetaMask before sending
          if (window.ethereum && ethAddress) {
            try {
              const balanceHex = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [ethAddress, 'latest'],
              });
              const balanceWei = BigInt(balanceHex);
              const amountWei = parseEther(amount);
              const minBalanceNeeded = amountWei + BigInt(21000) * BigInt(1000000000); // amount + estimated gas
              
              console.log('Balance check:', {
                balanceWei: balanceWei.toString(),
                amountWei: amountWei.toString(),
                minBalanceNeeded: minBalanceNeeded.toString(),
                hasEnough: balanceWei >= minBalanceNeeded,
              });
              
              if (balanceWei < minBalanceNeeded) {
                const balanceFormatted = (Number(balanceWei) / 1e18).toFixed(6);
                setError(`Insufficient balance. You have ${balanceFormatted} MATIC, but need at least ${(Number(minBalanceNeeded) / 1e18).toFixed(6)} MATIC (amount + gas fees).`);
                return;
              }
            } catch (balanceError) {
              console.warn('Could not check balance directly, proceeding anyway:', balanceError);
            }
          }
          
          // verify MetaMask's actual chain ID before sending
          // wagmi's chain.id might be out of sync with MetaMask's actual network
          let metaMaskChainId: number | null = null;
          if (window.ethereum) {
            try {
              const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
              metaMaskChainId = typeof chainIdHex === 'string' && chainIdHex.startsWith('0x') 
                ? parseInt(chainIdHex, 16) 
                : Number(chainIdHex);
              console.log('MetaMask actual chain ID:', metaMaskChainId, 'Expected:', expectedChain.id);
            } catch (chainError) {
              console.error('Failed to get MetaMask chain ID:', chainError);
            }
          }
          
          // if MetaMask is on wrong network, show error and don't send
          if (metaMaskChainId !== null && metaMaskChainId !== expectedChain.id) {
            const chainNames: Record<number, string> = {
              11155111: 'Sepolia',
              1: 'Ethereum Mainnet',
            };
            const currentNetwork = chainNames[metaMaskChainId] || `Chain ${metaMaskChainId}`;
            const expectedNetwork = expectedChain.name;
            setError(`Network mismatch: MetaMask is on ${currentNetwork} (Chain ID: ${metaMaskChainId}), but this app requires ${expectedNetwork} (Chain ID: ${expectedChain.id}). Please switch networks in MetaMask.`);
            return;
          }
          
          // send transaction directly through MetaMask to bypass wagmi's RPC handling
          // this avoids any potential formatting issues between wagmi and MetaMask
          console.log('Sending native token transaction directly via MetaMask:', {
            to: recipientAddress,
            value: parseEther(amount).toString(),
            expectedChainId: expectedChain.id,
            actualChainId: actualChainId,
            metaMaskChainId: metaMaskChainId,
            amount: amount,
          });
          
          // test RPC connection before sending transaction
          if (window.ethereum) {
            try {
              // test with a simple call to verify RPC is working
              await window.ethereum.request({ method: 'eth_blockNumber' });
              console.log('RPC connection test passed before sending transaction');
            } catch (rpcTestError) {
              console.error('RPC connection test failed:', rpcTestError);
              setError('RPC connection test failed. MetaMask may be having issues with the network. Please try: 1) Refreshing the page, 2) Switching to a different network and back, or 3) Checking MetaMask network settings.');
              return;
            }
          }
          
          try {
            setIsDirectSending(true);
            
            // prepare transaction parameters
            const txParams = {
              from: ethAddress,
              to: recipientAddress,
              value: `0x${parseEther(amount).toString(16)}`,
              // don't specify gas - let MetaMask estimate
              // don't specify gasPrice - let MetaMask set it
            };
            
            console.log('Transaction parameters:', txParams);
            
            // send directly through MetaMask's provider - bypass wagmi entirely
            const txHash = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [txParams],
            }) as `0x${string}`;
            
            console.log('Transaction sent directly via MetaMask, hash:', txHash);
            // set the hash so wagmi's receipt hook can track it
            setManualEthHash(txHash);
            setIsDirectSending(false);
            // clear any previous errors
            setError(null);
          } catch (directError: unknown) {
            console.error('Direct MetaMask send failed:', directError);
            setIsDirectSending(false);
            
            // extract error details
            let errorMessage = 'Transaction failed';
            let errorCode: number | undefined;
            
            if (directError instanceof Error) {
              errorMessage = directError.message;
            } else if (typeof directError === 'object' && directError !== null) {
              const errorObj = directError as Record<string, unknown>;
              if ('message' in errorObj) {
                errorMessage = String(errorObj.message);
              }
              if ('code' in errorObj) {
                errorCode = Number(errorObj.code);
              }
              // check for nested error details
              if ('data' in errorObj && typeof errorObj.data === 'object' && errorObj.data !== null) {
                const data = errorObj.data as Record<string, unknown>;
                if ('message' in data) {
                  errorMessage = String(data.message);
                }
              }
            } else {
              errorMessage = String(directError);
            }
            
            console.error('Full error details:', {
              error: directError,
              message: errorMessage,
              code: errorCode,
            });
            
            // check if user rejected the transaction
            const isUserRejection = 
              errorMessage.toLowerCase().includes('user rejected') ||
              errorMessage.toLowerCase().includes('rejected the request') ||
              errorMessage.toLowerCase().includes('user denied') ||
              errorMessage.toLowerCase().includes('4001') ||
              errorCode === 4001;
            
            // only set error if it's not a user rejection
            // user rejections are normal and shouldn't show an error
            if (!isUserRejection) {
              // for RPC errors, provide helpful troubleshooting info
              if (errorCode === -32603 || errorMessage.includes('Internal JSON-RPC error')) {
                setError(`MetaMask RPC Error: ${errorMessage}\n\nThis usually means MetaMask's RPC endpoint is having issues. Try:\n1. Refreshing the page\n2. Switching networks in MetaMask and switching back\n3. Checking MetaMask → Settings → Networks → Sepolia → RPC URL\n4. Resetting MetaMask account (Settings → Advanced → Reset Account)`);
              } else {
                setError(errorMessage);
              }
            } else {
              // clear any previous errors on user rejection
              setError(null);
            }
          }
        } else {
          // ERC20 token transfer
          const amountInWei = parseUnits(amount, selectedToken.decimals);
          // writeContract triggers the wallet prompt - errors handled by hook
          // don't specify chainId - let wagmi use MetaMask's current chain/provider
          // this ensures wagmi uses MetaMask's RPC instead of the HTTP transport
          writeContract({
            address: selectedToken.contractAddress as Address,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipientAddress as Address, amountInWei],
            // chainId removed - wagmi will use the current chain from MetaMask
          });
        }
      } else if (isSol) {
        // solana transaction
        if (!solAddress) {
          setError('Please connect your wallet');
          return;
        }

        setIsSolSending(true);

        if (!selectedToken || selectedToken.contractAddress === 'native') {
          // native SOL transfer
          const recipientPubkey = new PublicKey(recipientAddress);
          const amountLamports = parseFloat(amount) * LAMPORTS_PER_SOL;

          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: solAddress,
              toPubkey: recipientPubkey,
              lamports: amountLamports,
            })
          );

          const signature = await wallet?.adapter.sendTransaction(transaction, connection);
          setSolHash(signature || null);

          if (signature) {
            await connection.confirmTransaction(signature, 'confirmed');
            setIsSolSuccess(true);
          }
        } else {
          // SPL token transfer
          const mintPubkey = new PublicKey(selectedToken.contractAddress);
          const recipientPubkey = new PublicKey(recipientAddress);
          const senderTokenAccount = await getAssociatedTokenAddress(mintPubkey, solAddress);
          const recipientTokenAccount = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

          const amountInSmallestUnit = BigInt(parseFloat(amount) * Math.pow(10, selectedToken.decimals));

          const transferInstruction = createTransferInstruction(
            senderTokenAccount,
            recipientTokenAccount,
            solAddress,
            amountInSmallestUnit
          );

          const transaction = new Transaction().add(transferInstruction);
          const signature = await wallet?.adapter.sendTransaction(transaction, connection);
          setSolHash(signature || null);

          if (signature) {
            await connection.confirmTransaction(signature, 'confirmed');
            setIsSolSuccess(true);
          }
        }

        setIsSolSending(false);
      }
    } catch (error: unknown) {
      console.error('Error sending tip:', error);
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      setError(errorMessage);
      setIsSolSending(false);
    }
  }, [amount, selectedBlockchain, selectedToken, networkMismatch, isEVM, isSol, ethAddress, solAddress, writeContract, wallet, connection, receivingAddresses, expectedChain, actualChainId, lastNetworkSwitchTime]);

  // auto-send transaction when wallet connects
  useEffect(() => {
    if (isConnected && amount && showWalletSelector && selectedBlockchain && !isBtc) {
      handleSendTip();
      setShowWalletSelector(false);
    }
  }, [isConnected, amount, showWalletSelector, selectedBlockchain, isBtc, handleSendTip]);

  // generate BTC QR when amount changes
  useEffect(() => {
    if (isBtc && amount && receivingAddresses.bitcoin) {
      generateBtcQR();
    }
  }, [isBtc, amount, receivingAddresses.bitcoin, generateBtcQR]);

  const handleTipClick = () => {
    if (!selectedBlockchain) {
      setError('Please select a blockchain');
      return;
    }

    if (isBtc) {
      // bitcoin just shows address/QR
      return;
    }

    if (!selectedToken) {
      setError('Please select a token');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError(null);

    if (isConnected) {
      handleSendTip();
    } else {
      setShowWalletSelector(true);
    }
  };

  const handleConnectWallet = (connector?: typeof connectors[0], walletName?: string) => {
    if (isEVM && connector) {
      connectEth({ connector });
    } else if (isSol && walletName) {
      const selectedWallet = wallets.find(w => w.adapter.name === walletName);
      if (selectedWallet) {
        select(selectedWallet.adapter.name);
        setTimeout(() => {
          connectSol();
        }, 100);
      }
    }
  };
  
  // switch to correct network
  const handleSwitchNetwork = useCallback(async () => {
    if (!expectedChain || !window.ethereum) return;
    setIsSwitchingNetwork(true);
    setError(null); // clear any previous errors
    
    try {
      const chainIdHex = `0x${expectedChain.id.toString(16)}`;
      console.log('Switching to chain:', expectedChain.id, expectedChain.name, 'hex:', chainIdHex);
      
      // use MetaMask's direct API to switch - this will prompt user for approval
      // the await here waits for user to approve/reject the switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        console.log('Network switch approved by user, waiting for switch to complete...');
        // wait a moment after user approval to let MetaMask complete the switch
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (switchError: unknown) {
        // if network is not added, error code 4902 means we need to add it
        const error = switchError as { code?: number; message?: string };
        if (error.code === 4902) {
          console.log('Network not found, attempting to add it...');
          // network not added, try to add it (this also prompts user for approval)
          await window.ethereum.request({
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
          console.log('Network added and approved by user, waiting for switch to complete...');
          // wait a moment after user approval to let MetaMask complete the switch
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // other error (user rejected, etc.)
          throw switchError;
        }
      }
      
      // wait for the chain to actually switch by polling the chain ID
      // this ensures the switch completes before the UI updates
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait (increased for slower switches)
      const checkChain = async (): Promise<boolean> => {
        if (!window.ethereum) {
          setIsSwitchingNetwork(false);
          return false;
        }
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const chainIdNum = typeof chainId === 'string' && chainId.startsWith('0x') 
            ? parseInt(chainId, 16) 
            : Number(chainId);
          
          console.log('Checking chain switch - attempt:', attempts + 1, 'current:', chainIdNum, 'expected:', expectedChain.id);
          
          if (chainIdNum === expectedChain.id) {
            console.log('Chain switch confirmed! Waiting for network to be ready...');
            
            // wait longer to ensure the network is fully ready (RPC connection established)
            // increased from 500ms to 1500ms to give wagmi time to sync
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // verify one more time that we're still on the correct chain
            const finalCheck = await window.ethereum.request({ method: 'eth_chainId' });
            const finalChainIdNum = typeof finalCheck === 'string' && finalCheck.startsWith('0x') 
              ? parseInt(finalCheck, 16) 
              : Number(finalCheck);
            
            if (finalChainIdNum === expectedChain.id) {
              // test RPC connection by making a simple call
              try {
                await window.ethereum.request({ method: 'eth_blockNumber' });
                console.log('RPC connection verified');
              } catch (rpcError) {
                console.warn('RPC connection test failed, but continuing:', rpcError);
              }
              
              // wait longer for wagmi to sync (it updates reactively via useAccount hook)
              // we can't check chain.id directly here because it's reactive and the closure would be stale
              // instead, we wait a reasonable amount of time for wagmi to catch up and update its RPC provider
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              console.log('Network switch complete!');
              setActualChainId(finalChainIdNum);
              setError(null);
              setIsSwitchingNetwork(false);
              // track when network switch completed (for extra delay on next transaction)
              setLastNetworkSwitchTime(Date.now());
              return true;
            }
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(() => checkChain(), 100); // check every 100ms
          } else {
            console.warn('Chain switch timeout - chain may not have switched');
            // still update actualChainId with what we got
            setActualChainId(chainIdNum);
            setIsSwitchingNetwork(false);
            setError('Network switch may not have completed. Please verify you are on the correct network and try again.');
            return false;
          }
        } catch (err) {
          console.error('Error checking chain:', err);
          attempts++;
          if (attempts < maxAttempts) {
            // retry on error (network might still be switching)
            setTimeout(() => checkChain(), 100);
          } else {
            setIsSwitchingNetwork(false);
            setError('Error verifying network switch. Please check your wallet.');
            return false;
          }
        }
        return false;
      };
      
      // start checking after a short delay to allow the switch to initiate
      setTimeout(() => checkChain(), 200);
    } catch (error) {
      console.error('Error switching network:', error);
      setIsSwitchingNetwork(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // check if user rejected the switch
      if (errorMessage.toLowerCase().includes('rejected') || errorMessage.toLowerCase().includes('user denied')) {
        setError('Network switch was cancelled. Please switch manually in your wallet.');
      } else {
        setError(`Failed to switch network: ${errorMessage}. Please switch manually in your wallet.`);
      }
    }
  }, [expectedChain]);

  const quickAmounts = ['0.01', '0.05', '0.1', '0.5', '1'];

  // blockchain selection screen
  if (!selectedBlockchain) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
                <Wallet className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Select Blockchain</h2>
              <p className="text-gray-400">Choose which blockchain to send payment on</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(['ethereum', 'solana', 'bitcoin'] as Blockchain[]).map((chain) => (
                <button
                  key={chain}
                  onClick={() => setSelectedBlockchain(chain)}
                  className="py-6 px-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-700 hover:to-slate-800 rounded-xl font-semibold transition-all duration-300 hover:scale-105 border border-slate-600/50"
                >
                  <div className="text-2xl font-bold capitalize mb-1">{chain}</div>
                  <div className="text-sm text-gray-400">
                    {chain === 'bitcoin' ? 'BTC' : chain === 'ethereum' ? 'ETH & ERC20' : 'SOL & SPL'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // bitcoin - just show address/QR
  if (isBtc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <button
            onClick={() => setSelectedBlockchain(null)}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="bg-slate-800/50 backdrop-blur-lg rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4">
                <Wallet className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Bitcoin Payment</h2>
              <p className="text-gray-400">Enter amount and scan QR code to send</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">
                  Amount (BTC)
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-6 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-2xl font-bold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>

              {receivingAddresses.bitcoin && (
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                  <p className="text-sm text-gray-400 mb-2">Your payment address is pre-filled</p>
                  <p className="font-mono text-xs break-all text-gray-500">{receivingAddresses.bitcoin.slice(0, 10)}...{receivingAddresses.bitcoin.slice(-8)}</p>
                </div>
              )}

              {btcQrCode && amount && (
                <div className="flex justify-center">
                  <img src={btcQrCode} alt="Bitcoin QR Code" className="w-64 h-64 bg-white p-4 rounded-xl" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ethereum/polygon/solana - token selection and payment
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => setSelectedBlockchain(null)}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-slate-800/50 backdrop-blur-lg rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
              <Wallet className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-2 capitalize">{selectedBlockchain}</h2>
            <p className="text-gray-400">Your payment address is pre-filled automatically - no need to enter it!</p>
          </div>

          {!isSuccess ? (
            <div className="space-y-6">
              {/* token selection */}
              {!selectedToken ? (
                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-300">
                    Select Token
                  </label>
                  <div className="space-y-3">
                    {/* native token */}
                    {POPULAR_TOKENS[selectedBlockchain]?.native.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => setSelectedToken(token)}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                      >
                        {token.symbol} - {token.name}
                      </button>
                    ))}
                    {/* popular tokens */}
                    {POPULAR_TOKENS[selectedBlockchain]?.tokens.map((token) => (
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
                  {/* selected token display */}
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

                  {/* amount input */}
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
                      }}
                      placeholder="0.00"
                      disabled={isSending || isConfirming}
                      className="w-full px-6 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-2xl font-bold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50"
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
                        }}
                        disabled={isSending || isConfirming}
                        className="py-2 px-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* wallet selector */}
              {showWalletSelector && !isConnected && (
                <div className="space-y-4 p-6 bg-slate-900/50 rounded-xl border border-slate-700/50">
                  <p className="text-center text-gray-300 mb-4">Select a wallet to continue</p>
                  {isEVM ? (
                    connectors.length > 0 ? (
                      <>
                        {connectors.map((connector) => {
                          // allow connection attempt even if not "ready" - wagmi will handle errors
                          const canConnect = connector.ready;
                          return (
                            <button
                              key={connector.uid}
                              onClick={() => {
                                console.log('Connector:', connector.name, 'Ready:', connector.ready, 'Type:', connector.type);
                                handleConnectWallet(connector);
                              }}
                              className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                                canConnect
                                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:scale-105'
                                  : 'bg-slate-700/50 hover:bg-slate-700 text-gray-300'
                              }`}
                            >
                              {connector.name}
                              {!canConnect && ' (May need installation)'}
                            </button>
                          );
                        })}
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Detected {connectors.length} wallet{connectors.length !== 1 ? 's' : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-center text-gray-400 text-sm">No wallets detected. Please install MetaMask or another wallet extension.</p>
                    )
                  ) : (
                    wallets.length > 0 ? (
                      <>
                        {wallets.map((wallet) => {
                          // solana wallet adapter states: 'Installed', 'Loadable', 'NotDetected', 'Unsupported'
                          const readyState = wallet.adapter.readyState;
                          const canConnect = readyState === 'Installed' || readyState === 'Loadable';
                          return (
                            <button
                              key={wallet.adapter.name}
                              onClick={() => {
                                console.log('Solana Wallet:', wallet.adapter.name, 'State:', readyState);
                                handleConnectWallet(undefined, wallet.adapter.name);
                              }}
                              className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                                canConnect
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105'
                                  : 'bg-slate-700/50 hover:bg-slate-700 text-gray-300'
                              }`}
                            >
                              {wallet.adapter.name}
                              {!canConnect && ` (${readyState})`}
                            </button>
                          );
                        })}
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Detected {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-center text-gray-400 text-sm">No wallets detected. Please install Phantom or Solflare extension.</p>
                    )
                  )}
                  <button
                    onClick={() => setShowWalletSelector(false)}
                    className="w-full py-2 px-4 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* connected wallet info */}
              {isConnected && !showWalletSelector && (
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-2">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Connected Wallet</p>
                    <p className="font-mono text-sm">
                      {isEVM
                        ? `${ethAddress?.slice(0, 6)}...${ethAddress?.slice(-4)}`
                        : `${solAddress?.toString().slice(0, 6)}...${solAddress?.toString().slice(-4)}`
                      }
                    </p>
                  </div>
                  {currentNetwork && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Network</p>
                      <p className="text-sm font-medium">
                        {currentNetwork}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (isEVM) disconnectEth();
                      else disconnectSol();
                    }}
                    className="text-sm text-red-400 hover:text-red-300 mt-2"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* network mismatch warning */}
              {networkMismatch && expectedChain && (
                <div className="flex flex-col gap-3 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-400 mb-1">Network Mismatch Detected</p>
                      <p className="text-sm text-yellow-300/80 mb-2">
                        Your wallet is on <strong>{currentNetwork || `Chain ${actualChainId || 'Unknown'}`}</strong> (Chain ID: {actualChainId || 'Unknown'}), but this app expects <strong>{expectedChain.name}</strong> (Chain ID: {expectedChain.id}).
                      </p>
                      <p className="text-xs text-yellow-300/60 mb-3">
                        Transactions may fail or send to the wrong network. Please switch to the correct network.
                      </p>
                      {chain && (
                        <button
                          onClick={handleSwitchNetwork}
                          disabled={isSwitchingNetwork}
                          className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSwitchingNetwork ? 'Switching...' : `Switch to ${expectedChain.name}`}
                        </button>
                      )}
                      {!chain && (
                        <p className="text-xs text-yellow-300/60">
                          Please manually switch your wallet to {expectedChain.name} network.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* error messages */}
              {/* don't show error if network mismatch warning is already showing */}
              {formattedError && !networkMismatch && (
                  <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Transaction Error</p>
                      <p className="text-sm whitespace-pre-line">
                        {formattedError}
                      </p>
                      {formattedError.includes('Insufficient balance') && (
                        <p className="text-xs text-red-300/80 mt-2">
                          Tip: Make sure you have enough {selectedToken?.symbol || 'tokens'} to cover the amount plus gas fees.
                        </p>
                      )}
                      {(formattedError.includes('Internal JSON-RPC error') || formattedError.includes('-32603')) && isConnected && (
                        <button
                          onClick={async () => {
                            setError(null);
                            // disconnect and reconnect wallet
                            if (isEVM) {
                              disconnectEth();
                              // wait a moment then reconnect
                              setTimeout(() => {
                                const connector = connectors.find(c => c.ready);
                                if (connector) {
                                  connectEth({ connector });
                                }
                              }, 500);
                            } else if (isSol) {
                              disconnectSol();
                              setTimeout(() => {
                                connectSol();
                              }, 500);
                            }
                          }}
                          className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          Reconnect Wallet
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {/* send button */}
              {selectedToken && !showWalletSelector && (
                <button
                  onClick={handleTipClick}
                  disabled={!amount || isSending || isConfirming || networkMismatch || isSwitchingNetwork}
                  className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isSending || isConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isSending ? 'Sending...' : 'Confirming...'}
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
              {hash && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Transaction</p>
                  {explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-cyan-400 hover:text-cyan-300 font-mono break-all underline transition-colors"
                    >
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
                  setSolHash(null);
                  setIsSolSuccess(false);
                  setManualEthHash(null); // reset manual hash
                  if (isEVM) {
                    disconnectEth();
                  } else {
                    disconnectSol();
                  }
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

