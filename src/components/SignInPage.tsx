import { useState } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Mail, Smartphone, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { authEmailUserMessage, logClientError } from '../lib/userFacingErrors';

/** get-started / sign-in page — email, wallet, google. explains each method for clarity. */
export default function SignInPage() {
  const { openConnectModal: open } = useConnectModal();
  const onWalletConnect = open ?? (() => {});

  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleEmailSignIn = async () => {
    const trimmed = email.trim();
    if (!trimmed || !supabase) {
      setEmailError(supabase ? 'Enter your email' : "Email sign-in isn't available on this device right now.");
      return;
    }
    setEmailError(null);
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      });
      if (error) throw error;
      setEmailSent(true);
    } catch (e) {
      logClientError('signInWithOtp', e);
      setEmailError(authEmailUserMessage());
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      });
    } catch (e) {
      logClientError('google OAuth', e);
      setGoogleError("Couldn't open Google sign-in. Please try again or use another sign-in option.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const LOGO_SRC = '/logo/piri.png';
  const LOGO_FALLBACK = '/logo/piri-heart.png';

  return (
    <div className="piri-page">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-piri-cashapp bg-piri-cream shadow-lg">
              <img
                src={LOGO_SRC}
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
                    img.src = LOGO_FALLBACK;
                  }
                }}
              />
              <span className="hidden piri-heading text-4xl font-black text-piri-cashapp" aria-hidden>P</span>
            </div>
          </div>
          <h1 className="piri-heading text-4xl font-black mb-2">Welcome to Piri</h1>
          <p className="text-lg font-bold text-piri mb-1">Pick your flavors. Get paid.</p>
          <p className="text-sm piri-muted mb-6">Choose one way to sign in below. New or returning — same flow.</p>
        </div>

        <div className="space-y-6 max-w-md mx-auto">
          {/* email — magic link */}
          <section className="p-5 rounded-2xl border-2 border-piri/30 bg-piri-cream shadow-sm">
            <h2 className="font-bold text-piri mb-1 flex items-center gap-2">
              <Mail className="w-5 h-5" /> Sign in with Email
            </h2>
            <p className="text-sm piri-muted mb-4">
              Enter your email and we'll send you a magic link. Click the link in your inbox — no password needed. Check spam if you don't see it.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={emailSent || !supabase}
                className="min-w-0 flex-1 px-4 py-3 rounded-xl border-2 border-piri/30 bg-white font-medium placeholder:piri-muted focus:outline-none focus:border-piri disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleEmailSignIn}
                disabled={emailLoading || emailSent || !supabase}
                className="w-full px-5 py-3 rounded-xl border-2 border-piri bg-piri/10 hover:bg-piri/20 font-bold text-piri shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:w-auto"
              >
                {emailLoading ? 'Sending...' : emailSent ? 'Sent' : 'Send link'}
              </button>
            </div>
            {emailSent && (
              <p className="text-sm text-piri font-semibold mt-3">Check your inbox — click the link to continue.</p>
            )}
            {emailError && (
              <p className="text-sm text-red-600 font-semibold mt-2">{emailError}</p>
            )}
          </section>

          {/* google */}
          <section className="p-5 rounded-2xl border-2 border-piri/30 bg-piri-cream shadow-sm">
            <h2 className="font-bold text-piri mb-1 flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </h2>
            <p className="text-sm piri-muted mb-4">
              Use your existing Google account. One click — we'll open Google in a new tab, you approve, and we'll bring you back here.
            </p>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={!supabase || googleLoading}
              className="w-full py-3 px-4 rounded-xl border-2 border-piri/30 bg-white hover:bg-piri/5 font-bold text-piri flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
              <ChevronRight className="w-5 h-5" />
            </button>
            {googleError && (
              <p className="text-sm text-red-600 font-semibold mt-2">{googleError}</p>
            )}
          </section>

          {/* wallet */}
          <section className="p-5 rounded-2xl border-2 border-piri-cashapp/50 bg-piri-cashapp/10 shadow-sm">
            <h2 className="font-bold text-piri mb-1 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-piri-cashapp" /> Sign in with Wallet
            </h2>
            <p className="text-sm piri-muted mb-4">
              Connect your crypto wallet (MetaMask, Coinbase Wallet, Rainbow, etc.). You'll approve the connection, then sign a message to verify you own it. No password — just two quick taps in your wallet.
            </p>
            <button
              type="button"
              onClick={onWalletConnect}
              className="w-full py-3 px-4 rounded-xl border-2 border-piri-cashapp bg-piri-cashapp/20 hover:bg-piri-cashapp/30 font-bold text-piri flex items-center justify-center gap-2 transition-colors"
            >
              Connect wallet
              <ChevronRight className="w-5 h-5" />
            </button>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/getting-started"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border-2 border-piri-cashapp bg-piri-cashapp/15 text-piri-cashapp hover:bg-piri-cashapp/25 transition-colors"
          >
            How Piri Pay works
          </a>
          <div className="mt-3">
            <a
              href="https://forms.gle/DEr8KYcXPKkSomUf7"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border-2 border-piri-fresa bg-piri-fresa/10 text-piri-fresa hover:bg-piri-fresa/20 transition-colors"
            >
              Report a bug
            </a>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs piri-muted">
            Made with <span aria-label="love">🍧</span> for{' '}
            <a href="https://x.com/homebasedotlove" target="_blank" rel="noopener noreferrer" className="piri-link">Home Base</a>
            {' · ETH Denver 2026'}
          </p>
        </div>
      </div>
    </div>
  );
}
