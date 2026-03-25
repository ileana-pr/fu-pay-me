const MASCOT = '/logo/piri.png';

const Section = ({
  title,
  children,
  accent = '#14B8A6',
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) => (
  <div
    className="rounded-3xl p-6 border-2"
    style={{ background: `${accent}0D`, borderColor: `${accent}40` }}
  >
    <h2
      className="text-2xl font-black mb-4"
      style={{ color: '#2D0A00', fontFamily: "'Fredoka One', cursive" }}
    >
      {title}
    </h2>
    {children}
  </div>
);

const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-4">
    <h3 className="text-lg font-black mb-2" style={{ color: '#2D0A00', fontFamily: "'Fredoka One', cursive" }}>
      {title}
    </h3>
    <div className="text-sm leading-relaxed space-y-2" style={{ color: '#2D0A00', opacity: 0.9 }}>
      {children}
    </div>
  </div>
);

export default function WhitepaperPage() {
  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{ background: '#FFFBF2', fontFamily: "'Nunito', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
        <a
          href="/"
          className="inline-flex items-center gap-2 font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#14B8A6' }}
        >
          ← Back to login
        </a>
        <a
          href="/getting-started"
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#14B8A6' }}
        >
          Get started
        </a>
      </div>

      <div className="text-center mb-10">
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#14B8A6' }}>
          Vision
        </p>
        <h1
          className="text-5xl md:text-7xl font-black leading-none"
          style={{ color: '#2D0A00', fontFamily: "'Fredoka One', cursive" }}
        >
          Piri Whitepaper
        </h1>
        <p className="text-base font-bold mt-1 opacity-50" style={{ color: '#2D0A00' }}>
          One QR, every way to pay
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-10">
        <div
          className="rounded-3xl overflow-hidden shadow-2xl border-4 grid md:grid-cols-2"
          style={{ borderColor: '#14B8A6' }}
        >
          <div className="flex items-center justify-center p-8" style={{ background: '#FFF0D6' }}>
            <div className="w-40 h-40 overflow-hidden">
              <img
                src={MASCOT}
                alt="Piri"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center p-6 gap-2" style={{ background: '#14B8A6' }}>
            <p className="text-white/80 text-sm leading-relaxed">
              A unified payment profile: one shareable QR for all your methods. Scan, select, approve.
            </p>
            <p className="text-white/60 text-xs">
              Fiat + crypto · no custody · platform agnostic
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <Section title="🧾 Executive Summary" accent="#14B8A6">
          <div className="text-sm leading-relaxed space-y-3" style={{ color: '#2D0A00' }}>
            <p>
              I&apos;m tackling a real friction point in modern payments: the fragmentation of payment methods across multiple platforms and blockchains. Today, recipients have to share different wallet addresses for each cryptocurrency (Ethereum, Solana, Bitcoin) and separate usernames for each fiat payment app (Cash App, Venmo, Zelle). That creates a cumbersome experience where payers navigate multiple apps, manually enter addresses or usernames, and switch between different payment ecosystems.
            </p>
            <p>
              I solve it with a <strong>unified payment profile: one shareable QR for all your methods.</strong> You set your wallet addresses and payment handles once; the app generates one QR that works as a universal payment link. When someone scans it, they get a single page with every option—crypto and fiat—in one place.
            </p>
            <p>
              The flow is three steps: <strong>scan, select, approve.</strong> For crypto they connect their wallet, enter amount, sign—no copy-pasting addresses. For fiat the app deep-links into Cash App, Venmo, or Zelle with recipient and amount pre-filled. After they pay, I prompt them to create their own profile so the network grows.
            </p>
            <p className="text-xs opacity-70">
              <strong>Current status:</strong> The app supports Ethereum (ETH & ERC-20), Base, Solana (SOL & SPL), Bitcoin (BTC), Cash App, Venmo, and Zelle. More payment methods and chains planned over time.
            </p>
          </div>
        </Section>

        <Section title="🧩 Problem Statement" accent="#7BC8F5">
          <div className="text-sm leading-relaxed space-y-4" style={{ color: '#2D0A00' }}>
            <SubSection title="The Fragmentation of Payment Methods">
              <p>
                In today&apos;s digital economy, individuals and businesses accept payments through an ever-expanding array of methods. Each payment method requires its own identifier: a username for fiat apps, a wallet address for each blockchain. This fragmentation creates a fundamental usability problem—like having a business card with seven different phone numbers instead of one that routes to the right place.
              </p>
            </SubSection>
            <SubSection title="The Friction in Current Payment Flows">
              <p><strong>For Recipients:</strong> Managing multiple wallet addresses and payment handles; sharing payment info requires multiple messages; no single point of control.</p>
              <p><strong>For Payers:</strong> Uncertainty about which method the recipient has; long crypto addresses are error-prone; switching between wallet apps and payment platforms breaks the flow.</p>
              <p>Crypto addresses can be tied to domain names (ENS, .eth)—but you still have to type or spell them. Scanning a QR is scan-and-go: no typing, no mistakes.</p>
            </SubSection>
            <SubSection title="The Cost of Errors">
              <p>A single typo in a crypto address can result in lost funds with no recourse. That risk creates hesitation, especially for casual users. The cognitive load of verifying addresses creates a significant barrier to adoption.</p>
            </SubSection>
            <SubSection title="The Bridge Between Worlds">
              <p>Bridging fiat and crypto: Venmo users may be intimidated by wallets; crypto-native users may find fiat apps cumbersome. There&apos;s no unified experience that makes both payment types feel equally accessible.</p>
            </SubSection>
            <SubSection title="The opportunity">
              <p>I&apos;m not trying to replace existing payment methods. I&apos;m building a <strong>universal interface</strong>—like a universal remote for payments. One QR code that opens to every option the app supports.</p>
            </SubSection>
            <SubSection title="Why fiat alongside crypto?">
              <p>The best way to onboard normies is to put crypto right next to what they already use every day. Cash App and Venmo users get curious when they see familiar apps and unfamiliar ones side by side. <em>What&apos;s that one? I can pay with that too?</em> Placement next to what people already use builds familiarity. One page, one scan, every option visible.</p>
            </SubSection>
          </div>
        </Section>

        <Section title="🛠️ Solution Overview" accent="#10B981">
          <div className="text-sm leading-relaxed space-y-4" style={{ color: '#2D0A00' }}>
            <SubSection title="One profile, one QR">
              <p>One profile, one QR code, all payment methods. You set your payment info once; the app generates a single QR that works as a universal payment gateway. When someone scans it, they land on a web-based payment page with all your options in one layout. No app download or account creation—scan and pay.</p>
            </SubSection>
            <SubSection title="The payment flow">
              <p><strong>Step 1: Scan</strong> — The payer scans the QR. The QR contains a URL to your payment page. Payers only see options you actually accept.</p>
              <p><strong>Step 2: Select</strong> — They see a visual grid of payment options (crypto grouped, fiat with branding). They tap their preferred method.</p>
              <p><strong>Step 3: Approve</strong> — <strong>Crypto:</strong> Connect wallet, enter amount, sign. No copy-paste. <strong>Fiat:</strong> Deep link to Cash App / Venmo with recipient and amount pre-filled, or copy username for Zelle.</p>
              <p><strong>Step 4: Create profile (optional)</strong> — After payment, the app prompts the payer to create their own profile and QR. Natural onboarding funnel.</p>
            </SubSection>
            <SubSection title="How I designed it">
              <p><strong>No custody, no risk:</strong> The app never holds user funds. Crypto goes wallet-to-wallet; fiat is handled inside the payment apps. The app is only a routing layer.</p>
              <p><strong>Platform agnostic:</strong> Works on any device with a browser and QR scanning. Payers can pay without an account.</p>
              <p><strong>Progressive enhancement:</strong> Missing methods are handled gracefully. No crypto wallet? Fiat still works. The interface adapts.</p>
            </SubSection>
            <SubSection title="Technical foundation">
              <p>Piri is a web app that generates payment pages. The QR encodes a URL. No backend required for core functionality; payment info lives in the URL/page. For crypto: WalletConnect, browser extensions, non-custodial. For fiat: deep linking so web UI and native apps connect smoothly.</p>
            </SubSection>
          </div>
        </Section>

        <Section title="💡 Opportunities" accent="#FF6B9D">
          <div className="text-sm leading-relaxed space-y-4" style={{ color: '#2D0A00' }}>
            <SubSection title="Profile data">
              <p>When people create profiles, they tell the app which payment methods they use. Aggregated and anonymized, that signals who&apos;s hybrid, crypto-only, or fiat-first—useful for chains and wallets.</p>
            </SubSection>
            <SubSection title="Wallet connection and payment events">
              <p>Connection events and successful on-chain payments give real payment data: which wallet paid which profile, how much, on which chain. High-intent signal for investors and partners.</p>
            </SubSection>
            <SubSection title="Referral and viral growth">
              <p>Every payment page is a potential on-ramp. After someone pays, they&apos;re invited to create their own profile. Referral graph: who brings new users in, how deep those trees go.</p>
            </SubSection>
            <SubSection title="Monetization paths (without getting in the way)">
              <p>No ads in the payment flow. Value at the edges: data licensing (anonymized), B2B/API for event platforms and marketplaces, referral fees from wallets, grants and ecosystem deals, premium/pro profiles, strictly non-obstructive optional placements. Payment speed wins.</p>
            </SubSection>
          </div>
        </Section>
      </div>

      <p className="text-center text-xs opacity-20 mt-12 pb-4" style={{ color: '#2D0A00' }}>
        Piri · one scan, every flavor 🍧
      </p>
    </div>
  );
}
