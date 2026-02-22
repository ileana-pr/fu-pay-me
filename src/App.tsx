import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from './lib/web3Config';
import { SolanaWalletProvider } from './lib/solanaConfig.tsx';
import TipPage from './components/TipPage';
import HomePage from './components/HomePage';
import ProfileCreation from './components/ProfileCreation';
import ProfileView from './components/ProfileView';
import { UserProfile } from './components/ProfileCreation';
import { decodeProfileFromUrl } from './lib/profileUrl';

const queryClient = new QueryClient();

type Page = 'home' | 'create' | 'view';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // load saved profile from localStorage on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (!path.startsWith('/tip/')) {
      const saved = localStorage.getItem('fupayme-profile');
      if (saved) {
        try {
          setUserProfile(JSON.parse(saved));
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    }
  }, []);

  // if we're on a payment page, show TipPage
  const path = window.location.pathname;
  if (path.startsWith('/tip/')) {
    const encodedProfile = path.replace(/^\/tip\//, '').split('/')[0];
    try {
      const profile = decodeProfileFromUrl(encodedProfile);
      return (
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider coolMode={false}>
              <SolanaWalletProvider>
                <TipPage profile={profile} />
              </SolanaWalletProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      );
    } catch {
      // if error parsing, fall through to home page
    }
  }

  const handleCreateProfile = () => setCurrentPage('create');
  const handleViewProfile = () => setCurrentPage('view');
  const handleBackToHome = () => setCurrentPage('home');

  const handleSaveProfile = (profile: UserProfile) => {
    localStorage.setItem('fupayme-profile', JSON.stringify(profile));
    setUserProfile(profile);
    setCurrentPage('view');
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider coolMode={false}>
          <SolanaWalletProvider>
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
                initialProfile={userProfile}
              />
            )}
            {currentPage === 'view' && userProfile && (
              <ProfileView
                profile={userProfile}
                onBack={handleBackToHome}
                onEdit={handleCreateProfile}
              />
            )}
          </SolanaWalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
