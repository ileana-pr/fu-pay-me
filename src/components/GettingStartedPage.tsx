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

export default function GettingStartedPage() {
  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{ background: '#FFFBF2', fontFamily: "'Nunito', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div className="max-w-3xl mx-auto mb-6">
        <a
          href="/"
          className="inline-flex items-center gap-2 font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#14B8A6' }}
        >
          ← Back to login
        </a>
      </div>

      {/* header — same vibe as BrandPage */}
      <div className="text-center mb-10">
        <p
          className="text-xs font-black uppercase tracking-widest mb-1"
          style={{ color: '#14B8A6' }}
        >
          Docs
        </p>
        <h1
          className="text-6xl md:text-8xl font-black leading-none"
          style={{ color: '#2D0A00', fontFamily: "'Fredoka One', cursive" }}
        >
          Get started
        </h1>
        <p className="text-base font-bold mt-1 opacity-50" style={{ color: '#2D0A00' }}>
          One link, one QR — every way to get paid
        </p>
      </div>

      {/* hero: short version */}
      <div className="max-w-3xl mx-auto mb-10">
        <div
          className="rounded-3xl overflow-hidden shadow-2xl border-4 grid md:grid-cols-2"
          style={{ borderColor: '#14B8A6' }}
        >
          <div
            className="flex items-center justify-center p-8"
            style={{ background: '#FFFBF2' }}
          >
            <div className="relative w-48 h-48 overflow-hidden">
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
          <div
            className="flex flex-col justify-center p-6 gap-3"
            style={{ background: '#14B8A6' }}
          >
            <p className="text-white/70 text-xs font-black uppercase tracking-widest">
              The short version
            </p>
            <p className="text-white/90 text-sm leading-relaxed">
              You get one link and one QR. You add your payment info once. Everyone else uses that
              one link to pay you—Venmo, Cash App, crypto, whatever they like.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <Section title="🎯 What is Piri Pay in one sentence?" accent="#14B8A6">
          <p className="text-sm leading-relaxed" style={{ color: '#2D0A00' }}>
            <strong>One page where all your ways to get paid live.</strong> No more handing out five
            different links or usernames. One QR, one link, every option.
          </p>
        </Section>

        <Section title="👤 I want to get paid" accent="#10B981">
          <div className="flex flex-col gap-4 text-sm" style={{ color: '#2D0A00' }}>
            <div>
              <p className="font-black mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>
                Step 1: Open the app and sign up
              </p>
              <p className="opacity-80 leading-relaxed">
                Go to the app (e.g. <strong>piri-pay.vercel.app</strong>). Create an account with
                your email or wallet—then you&apos;re ready to set up your profile.
              </p>
            </div>
            <div>
              <p className="font-black mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>
                Step 2: Create your profile
              </p>
              <ul className="list-disc list-inside opacity-80 space-y-1">
                <li>Tap <strong>Create profile</strong> (or <strong>Get my QR</strong>).</li>
                <li>
                  Add how you want to get paid: <strong>Fiat</strong> — Cash App, Venmo, Zelle (your
                  username or cashtag). <strong>Crypto</strong> — wallet addresses for Ethereum,
                  Base, Solana, Bitcoin.
                </li>
                <li>You don&apos;t have to fill every option—only the ones you use.</li>
              </ul>
            </div>
            <div>
              <p className="font-black mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>
                Step 3: Get your link and QR
              </p>
              <p className="opacity-80 leading-relaxed">
                The app gives you <strong>one link</strong> and <strong>one QR code</strong>. Share
                that link or QR anywhere: socials, poster, sticker, bio. When someone opens it, they
                see all your payment options on one page and pick how they want to pay.
              </p>
            </div>
            <div>
              <p className="font-black mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>
                Step 4: You&apos;re done
              </p>
              <p className="opacity-80 leading-relaxed">
                They pay you via their chosen app or wallet. You don&apos;t have to do anything
                else. Money goes to the addresses/handles you added.
              </p>
            </div>
          </div>
        </Section>

        <Section title="💸 I want to pay someone" accent="#7BC8F5">
          <div className="flex flex-col gap-4 text-sm" style={{ color: '#2D0A00' }}>
            <div>
              <p className="font-black mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>
                Step 1: Open their link or scan their QR
              </p>
              <p className="opacity-80 leading-relaxed">
                Use the link they shared, or scan their QR with your phone camera.
              </p>
            </div>
            <div>
              <p className="font-black mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>
                Step 2: Choose how to pay
              </p>
              <p className="opacity-80 leading-relaxed">
                You&apos;ll see one page with their options: Cash App, Venmo, Zelle, ETH, SOL, BTC,
                etc. Tap the one you want to use.
              </p>
            </div>
            <div>
              <p className="font-black mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>
                Step 3: Pay
              </p>
              <p className="opacity-80 leading-relaxed">
                <strong>Fiat:</strong> You&apos;ll jump to Cash App / Venmo / Zelle with their info
                already filled in. Confirm there. <strong>Crypto:</strong> Connect your wallet
                (MetaMask, Phantom, etc.), enter amount, sign. Done.
              </p>
            </div>
          </div>
        </Section>

        <Section title="📱 Tips" accent="#F59E0B">
          <ul className="flex flex-col gap-2 text-sm" style={{ color: '#2D0A00' }}>
            <li className="flex gap-2">
              <span>✅</span>
              <span className="opacity-90">
                Double-check entries when you add your flavors—cash sent to the wrong name or address
                can&apos;t be undone.
              </span>
            </li>
            <li className="flex gap-2">
              <span>✅</span>
              <span className="opacity-90">
                Add as many payment options as possible—more Piri flavors means more ways to get
                paid.
              </span>
            </li>
          </ul>
        </Section>

        <Section title="🆘 Something not working?" accent="#FF6B9D">
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#2D0A00' }}>
            Use <strong>Report a bug</strong> — one short form, we&apos;ll take it from there.
          </p>
          <a
            href="https://forms.gle/DEr8KYcXPKkSomUf7"
            className="inline-block px-4 py-2 rounded-xl font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#FF6B9D' }}
          >
            Report a bug
          </a>
        </Section>

        <Section title="🔗 Quick links" accent="#14B8A6">
          <ul className="flex flex-col gap-2 text-sm" style={{ color: '#2D0A00' }}>
            <li>
              <strong>Live app:</strong>{' '}
              <a
                href="https://piri-pay.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: '#14B8A6' }}
              >
                piri-pay.vercel.app
              </a>
            </li>
            <li>
              <strong>Whitepaper:</strong>{' '}
              <a
                href="/whitepaper"
                className="underline"
                style={{ color: '#14B8A6' }}
              >
                Vision and how it works
              </a>
            </li>
            <li>
              <strong>Report a bug:</strong>{' '}
              <a href="/report-a-bug" className="underline" style={{ color: '#14B8A6' }}>
                Tell us what went wrong
              </a>
            </li>
          </ul>
        </Section>
      </div>

      <p
        className="text-center text-xs opacity-20 mt-12 pb-4"
        style={{ color: '#2D0A00' }}
      >
        Piri Pay · one scan, every flavor 🍧
      </p>
    </div>
  );
}
