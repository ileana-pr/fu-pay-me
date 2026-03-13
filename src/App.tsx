import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider as PrivyWagmiProvider } from '@privy-io/wagmi';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config as rainbowConfig } from './lib/web3Config';
import { config as privyWagmiConfig } from './lib/wagmiConfigPrivy';
import { privyConfig } from './lib/privyConfig';
import { SolanaWalletProvider } from './lib/solanaConfig.tsx';
import TipPageLoader from './components/TipPageLoader';
import HomePage from './components/HomePage';
import ProfileCreation from './components/ProfileCreation';
import ProfileView from './components/ProfileView';
import LoginPage from './components/LoginPage';
import WalletConfirmStep from './components/WalletConfirmStep';
import { UserProfile } from './components/ProfileCreation';
import BrandPage from './components/BrandPage';
import PrivyReadyGate from './components/PrivyReadyGate';
import { createProfile, updateProfile } from './lib/profileApi';

const queryClient = new QueryClient();

// secret brand page — no links from main site; access via /x-piri-brand
const BRAND_PATH = '/x-piri-brand';

const WALLET_CONFIRMED_KEY = 'piri_wallet_confirmed';

type Page = 'home' | 'create' | 'view' | 'login' | 'walletConfirm';

function AppContent({ hasPrivy }: { hasPrivy: boolean }) {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pendingPreFillAddress, setPendingPreFillAddress] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'create' | 'view' | null>(null);
  const { address, isConnected } = useAccount();

  // load saved profile from localStorage on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (!path.startsWith('/tip/')) {
      const saved = localStorage.getItem('piri-profile');
      if (saved) {
        try {
          setUserProfile(JSON.parse(saved));
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    }
  }, []);

  // when not connected, show login if user tried to access home/create/view
  useEffect(() => {
    if (!isConnected && (currentPage === 'home' || currentPage === 'create' || currentPage === 'view')) {
      setCurrentPage('login');
    }
  }, [isConnected, currentPage]);

  // when connected from login, show wallet confirm if not yet confirmed this session
  useEffect(() => {
    if (!isConnected) return;
    const confirmed = sessionStorage.getItem(WALLET_CONFIRMED_KEY);
    if (currentPage === 'login' && !confirmed) {
      setCurrentPage('walletConfirm');
    }
  }, [isConnected, currentPage]);

  const handleCreateProfile = () => {
    if (!isConnected) {
      setPendingAction('create');
      setCurrentPage('login');
    } else if (!sessionStorage.getItem(WALLET_CONFIRMED_KEY)) {
      setPendingAction('create');
      setCurrentPage('walletConfirm');
    } else {
      setCurrentPage('create');
    }
  };
  const handleViewProfile = () => {
    if (!isConnected) {
      setPendingAction('view');
      setCurrentPage('login');
    } else {
      setCurrentPage('view');
    }
  };
  const handleBackToHome = () => {
    setPendingAction(null);
    setCurrentPage('home');
  };

  const handleWalletConfirmYes = () => {
    sessionStorage.setItem(WALLET_CONFIRMED_KEY, '1');
    if (address) setPendingPreFillAddress(address);
    if (pendingAction === 'view') setCurrentPage('view');
    else if (pendingAction === 'create') setCurrentPage('create');
    else setCurrentPage(userProfile ? 'home' : 'create');
    setPendingAction(null);
  };
  const handleWalletConfirmNo = () => {
    sessionStorage.setItem(WALLET_CONFIRMED_KEY, '1');
    setPendingPreFillAddress(null);
    if (pendingAction === 'view') setCurrentPage('view');
    else if (pendingAction === 'create') setCurrentPage('create');
    else setCurrentPage(userProfile ? 'home' : 'create');
    setPendingAction(null);
  };

  const handleSaveProfile = async (profile: UserProfile) => {
    const { id, ...profileData } = profile;
    try {
      let saved: UserProfile = profile;
      if (id) {
        await updateProfile(id, profileData);
      } else {
        const { id: newId } = await createProfile(profileData);
        saved = { ...profile, id: newId };
      }
      localStorage.setItem('piri-profile', JSON.stringify(saved));
      setUserProfile(saved);
      setPendingPreFillAddress(null);
      setCurrentPage('view');
    } catch (e) {
      console.error('Save failed:', e);
      // fallback: save to localStorage only (legacy behavior)
      localStorage.setItem('piri-profile', JSON.stringify(profile));
      setUserProfile(profile);
      setCurrentPage('view');
    }
  };

  return (
    <>
      {currentPage === 'login' && <LoginPage hasPrivy={hasPrivy} />}
      {currentPage === 'walletConfirm' && (
        <WalletConfirmStep onYes={handleWalletConfirmYes} onNo={handleWalletConfirmNo} />
      )}
      {currentPage === 'home' && (
        <HomePage
          onCreateProfile={handleCreateProfile}
          onViewProfile={handleViewProfile}
          hasProfile={!!userProfile}
        />
      )}
      {currentPage === 'create' && (
        <ProfileCreation
          onSave={handleSaveProfile}
          onBack={handleBackToHome}
          initialProfile={
            pendingPreFillAddress
              ? {
                  ...(userProfile ?? {}),
                  ethereumAddress: pendingPreFillAddress,
                  baseAddress: pendingPreFillAddress,
                  solanaAddress: userProfile?.solanaAddress ?? '',
                } as UserProfile
              : userProfile
          }
        />
      )}
      {currentPage === 'view' && userProfile && (
        <ProfileView
          profile={userProfile}
          onBack={handleBackToHome}
          onEdit={handleCreateProfile}
        />
      )}
    </>
  );
}

function App() {
  const path = window.location.pathname;

  if (path === BRAND_PATH) {
    return <BrandPage />;
  }

  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

  // Privy's WagmiProvider uses useWallets — must not mount until PrivyProvider is ready
  const appContent = path.startsWith('/tip/') ? (
    <TipPageLoader segment={path.replace(/^\/tip\//, '').split('/')[0]} />
  ) : privyAppId ? (
    <AppContent hasPrivy={true} />
  ) : (
    <AppContent hasPrivy={false} />
  );

  const providersWithWagmi = (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={rainbowConfig}>
        <RainbowKitProvider coolMode={false}>
          <SolanaWalletProvider>
            {appContent}
          </SolanaWalletProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );

  const providersWithPrivyWagmi = (
    <QueryClientProvider client={queryClient}>
      <PrivyWagmiProvider config={privyWagmiConfig}>
        <RainbowKitProvider coolMode={false}>
          <SolanaWalletProvider>
            {appContent}
          </SolanaWalletProvider>
        </RainbowKitProvider>
      </PrivyWagmiProvider>
    </QueryClientProvider>
  );

  if (!privyAppId) {
    return providersWithWagmi;
  }

  return (
    <PrivyProvider appId={privyAppId} config={privyConfig}>
      <PrivyReadyGate>
        {providersWithPrivyWagmi}
      </PrivyReadyGate>
    </PrivyProvider>
  );
}

export default App;
