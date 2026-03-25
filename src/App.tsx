import { useState, useEffect } from 'react';
import { useAccount, useDisconnect, useSignMessage, useChainId } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config as rainbowConfig } from './lib/web3Config';
import { SolanaWalletProvider } from './lib/solanaConfig.tsx';
import TipPageLoader from './components/TipPageLoader';
import HomePage from './components/HomePage';
import ProfileCreation from './components/ProfileCreation';
import ProfileView from './components/ProfileView';
import SignInPage from './components/SignInPage';
import { UserProfile } from './components/ProfileCreation';
import BrandPage from './components/BrandPage';
import GettingStartedPage from './components/GettingStartedPage';
import WhitepaperPage from './components/WhitepaperPage';
import { createProfile, updateProfile, fetchProfileBySession } from './lib/profileApi';
import { signInWithSiwe } from './lib/siweAuth';
import { supabase } from './lib/supabase';

const queryClient = new QueryClient();

// secret brand page — no links from main site; access via /x-piri-brand
const BRAND_PATH = '/x-piri-brand';
const GETTING_STARTED_PATH = '/getting-started';
const WHITEPAPER_PATH = '/whitepaper';

type Page = 'home' | 'create' | 'view' | 'signIn';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pendingPreFillAddress, setPendingPreFillAddress] = useState<string | null>(null);
  const [hasSupabaseSession, setHasSupabaseSession] = useState<boolean | null>(null);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();

  const isSignedIn = isConnected || !!hasSupabaseSession;

  // process magic link (hash or query) + track supabase session
  useEffect(() => {
    if (!supabase) {
      setHasSupabaseSession(false);
      return;
    }
    const hash = window.location.hash;
    const search = window.location.search;
    const tokenSource = hash ? hash.substring(1) : search.substring(1);
    if (tokenSource) {
      const params = new URLSearchParams(tokenSource);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(() => {
            window.history.replaceState(null, '', window.location.pathname);
          })
          .catch(console.error);
      }
    }
    supabase.auth.getSession().then(({ data: { session } }) => setHasSupabaseSession(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSupabaseSession(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

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

  // when not signed in, show sign-in page (get started)
  useEffect(() => {
    if (hasSupabaseSession === null) return;
    if (!isSignedIn && (currentPage === 'home' || currentPage === 'create' || currentPage === 'view')) {
      setCurrentPage('signIn');
    }
  }, [isSignedIn, hasSupabaseSession, currentPage]);

  // when signed in (email/google): skip home if no profile — go straight to payment options
  useEffect(() => {
    if (!hasSupabaseSession) return;
    if (currentPage === 'signIn' || (currentPage === 'home' && !userProfile)) {
      setCurrentPage(userProfile ? 'home' : 'create');
    }
  }, [hasSupabaseSession, currentPage, userProfile]);

  // when signed in (wallet) with no profile: skip home page, go straight to profile creation
  useEffect(() => {
    if (!isSignedIn || userProfile) return;
    if (currentPage === 'home') {
      if (isConnected && address) setPendingPreFillAddress(address);
      setCurrentPage('create');
    }
  }, [isSignedIn, userProfile, currentPage, isConnected, address]);

  // when supabase session (google/email): fetch profile by user_id
  useEffect(() => {
    if (!hasSupabaseSession) return;
    let cancelled = false;
    fetchProfileBySession()
      .then((profile) => {
        if (cancelled) return;
        if (profile) {
          setUserProfile(profile);
          localStorage.setItem('piri-profile', JSON.stringify(profile));
          setPendingPreFillAddress(null);
          const hasPaymentMethods = !!(profile.ethereumAddress || profile.baseAddress || profile.bitcoinAddress || profile.solanaAddress || profile.cashAppCashtag?.trim() || profile.venmoUsername?.trim() || profile.zelleContact?.trim() || profile.paypalUsername?.trim());
          setCurrentPage(hasPaymentMethods ? 'view' : 'create');
        } else {
          setUserProfile(null);
          localStorage.removeItem('piri-profile');
          setCurrentPage('create');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('Failed to load profile:', e);
          setUserProfile(null);
          setCurrentPage('create');
        }
      });
    return () => { cancelled = true; };
  }, [hasSupabaseSession]);

  // when wallet connects (and no supabase session): SIWE — sign message, verify, get session
  // session fetch then loads profile (owner_address from verified address)
  useEffect(() => {
    if (!isConnected || !address || hasSupabaseSession || !signMessageAsync) return;
    let cancelled = false;
    signInWithSiwe(address, chainId, signMessageAsync)
      .then(() => {
        if (cancelled) return;
        // verifyOtp sets session; onAuthStateChange will update hasSupabaseSession
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('SIWE failed:', e);
          disconnect();
        }
      });
    return () => { cancelled = true; };
  }, [isConnected, address, hasSupabaseSession, signMessageAsync, chainId, disconnect]);

  const handleCreateProfile = () => {
    if (!isSignedIn) {
      setCurrentPage('signIn');
    } else {
      setCurrentPage('create');
    }
  };
  const handleViewProfile = () => {
    if (!isSignedIn) {
      setCurrentPage('signIn');
    } else {
      setCurrentPage('view');
    }
  };
  const handleBackToHome = () => {
    setCurrentPage('home');
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    disconnect();
    localStorage.removeItem('piri-profile');
    setUserProfile(null);
    setPendingPreFillAddress(null);
    setCurrentPage('signIn');
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
      throw e;
    }
  };

  return (
    <>
      {currentPage === 'signIn' && <SignInPage />}
      {currentPage === 'home' && (
        <HomePage
          onCreateProfile={handleCreateProfile}
          onViewProfile={handleViewProfile}
          onSignOut={handleSignOut}
          hasProfile={!!userProfile}
        />
      )}
      {currentPage === 'create' && (
        <ProfileCreation
          onSave={handleSaveProfile}
          onSignOut={handleSignOut}
          connectedWalletAddress={address ?? undefined}
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
          onSignOut={handleSignOut}
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
  if (path === GETTING_STARTED_PATH) {
    return <GettingStartedPage />;
  }
  if (path === WHITEPAPER_PATH) {
    return <WhitepaperPage />;
  }

  const appContent = path.startsWith('/tip/') ? (
    <TipPageLoader segment={path.replace(/^\/tip\//, '').split('/')[0]} />
  ) : (
    <AppContent />
  );

  return (
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
}

export default App;
