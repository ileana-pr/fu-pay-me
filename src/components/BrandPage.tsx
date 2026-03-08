import { useState } from 'react';

const MASCOT = '/logo/piri.png';

const FLAVORS = [
  { name: 'Fresa', color: '#FF6B9D', emoji: '🩷', method: 'Cash App', hex: '#FF6B9D' },
  { name: 'Tamarindo', color: '#FF9A3C', emoji: '🟠', method: 'Venmo', hex: '#FF9A3C' },
  { name: 'Limón', color: '#F5D800', emoji: '💛', method: 'Zelle', hex: '#F5D800' },
  { name: 'Coco', color: '#7BC8F5', emoji: '🩵', method: 'Ethereum', hex: '#7BC8F5' },
  { name: 'Parcha', color: '#B8E87A', emoji: '💚', method: 'Solana', hex: '#B8E87A' },
  { name: 'Uva', color: '#C97BF5', emoji: '💜', method: 'Bitcoin', hex: '#C97BF5' },
];

const Section = ({ title, children, accent = '#FF6B9D' }: { title: string; children: React.ReactNode; accent?: string }) => (
  <div className="rounded-3xl p-6 border-2" style={{ background: `${accent}0D`, borderColor: `${accent}40` }}>
    <h2 className="text-2xl font-black mb-4" style={{ color: '#2D0A00', fontFamily: "'Fredoka One', cursive" }}>{title}</h2>
    {children}
  </div>
);

const Tag = ({ text, sub, accent }: { text: string; sub?: string; accent: string }) => (
  <div className="rounded-2xl p-4 border-2" style={{ borderColor: `${accent}60`, background: `${accent}10` }}>
    <p className="font-black text-base leading-tight" style={{ color: '#2D0A00', fontFamily: "'Fredoka One', cursive" }}>{text}</p>
    {sub && <p className="text-xs mt-1 opacity-60" style={{ color: '#2D0A00' }}>{sub}</p>}
  </div>
);

const Notif = ({ emoji, text, sub, bg }: { emoji: string; text: string; sub: string; bg: string }) => (
  <div className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-md" style={{ background: bg }}>
    <span className="text-2xl">{emoji}</span>
    <div>
      <p className="text-white text-sm font-bold">{text}</p>
      <p className="text-xs text-white/60">{sub}</p>
    </div>
  </div>
);

export default function BrandPage() {
  const [tab, setTab] = useState('identity');

  const tabs = [
    { id: 'identity', label: '🎨 Identity' },
    { id: 'flavors', label: '🍧 Flavors' },
    { id: 'voice', label: '💬 Voice' },
    { id: 'universe', label: '🌎 Universe' },
  ];

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: '#FFFBF2', fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <div className="text-center mb-10">
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#FF6B9D' }}>
          Brand Identity · Final
        </p>
        <h1 className="text-6xl md:text-8xl font-black leading-none" style={{ color: '#2D0A00', fontFamily: "'Fredoka One', cursive" }}>
          Piri
        </h1>
        <p className="text-base font-bold mt-1 opacity-50" style={{ color: '#2D0A00' }}>
          La piragua del pueblo · One scan, every flavor 🇵🇷
        </p>
      </div>

      {/* ── HERO: mascot + name lockup ── */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="rounded-3xl overflow-hidden shadow-2xl border-4 grid md:grid-cols-2" style={{ borderColor: '#FF6B9D' }}>
          <div className="flex items-center justify-center p-8" style={{ background: '#FFF0D6' }}>
            <div className="relative w-64 h-64 overflow-hidden">
              <img
                src={MASCOT}
                alt="Piri mascot"
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center p-8 gap-5" style={{ background: '#FF6B9D' }}>
            <div>
              <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-1">Meet</p>
              <h2 className="text-7xl font-black text-white leading-none" style={{ fontFamily: "'Fredoka One', cursive" }}>Piri</h2>
              <p className="text-white/80 text-base font-bold mt-2">La piragua del pueblo.</p>
              <p className="text-white/60 text-sm mt-1 leading-relaxed">
                A payment app so sweet, people fall in love with the brand before they even open the QR.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {FLAVORS.map((f) => (
                <div key={f.name} title={f.name} className="w-9 h-9 rounded-full border-3 border-white/60 shadow-md" style={{ background: f.color }} />
              ))}
            </div>
            <p className="text-white/50 text-xs font-bold">Each color = a payment method flavor</p>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-5 py-2 rounded-full font-black text-sm border-2 transition-all"
              style={{
                background: tab === t.id ? '#FF6B9D' : 'white',
                color: tab === t.id ? 'white' : '#2D0A00',
                borderColor: tab === t.id ? '#2D0A00' : '#2D0A0020',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'identity' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="The Story" accent="#FF6B9D">
              <div className="flex flex-col gap-3 text-sm leading-relaxed" style={{ color: '#2D0A00' }}>
                <p>🏙️ <strong>Origin:</strong> Piri grew up on the corner of every barrio, watching vendors juggle Cash App, Venmo, three crypto wallets, and a prayer. Ridiculous.</p>
                <p>🍧 <strong>Mission:</strong> Every payment method is a flavor. One scan. Pick yours. No drama.</p>
                <p>🌈 <strong>Personality:</strong> Colorful, joyful, the life of the block. Sweet but never soft — Piri will advocate for you getting every coin you&apos;re owed.</p>
                <p>🇵🇷 <strong>Soul:</strong> Like the piragüero&apos;s cart — humble setup, but you&apos;d walk across town for it.</p>
              </div>
            </Section>
            <Section title="Typography & Logo" accent="#FF9A3C">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-black uppercase opacity-40 mb-1" style={{ color: '#2D0A00' }}>Display</p>
                  <p className="text-5xl font-black" style={{ fontFamily: "'Fredoka One', cursive", color: '#2D0A00' }}>Fredoka One</p>
                  <p className="text-xs opacity-40 mt-1" style={{ color: '#2D0A00' }}>Friendly, rounded, bold — same energy as the character</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase opacity-40 mb-1" style={{ color: '#2D0A00' }}>Body</p>
                  <p className="text-xl font-bold" style={{ color: '#2D0A00' }}>Nunito — warm, readable, human</p>
                </div>
                <div className="rounded-2xl p-4 text-center shadow-inner" style={{ background: '#2D0A00' }}>
                  <p className="text-5xl font-black text-white" style={{ fontFamily: "'Fredoka One', cursive" }}>piri</p>
                  <p className="text-xs text-white/30 mt-1">logo lockup · lowercase · friendly</p>
                </div>
              </div>
            </Section>
            <Section title="Mascot Sheet" accent="#7BC8F5">
              <p className="text-sm mb-3 opacity-60" style={{ color: '#2D0A00' }}>5 poses ready — waving, walking, winking, celebrating, holding heart</p>
              <div className="rounded-2xl overflow-hidden border-2" style={{ borderColor: '#7BC8F540' }}>
                <img src={MASCOT} alt="Piri mascot sheet" className="w-full object-cover" style={{ objectPosition: '0 55%', height: 180 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <p className="text-xs mt-2 opacity-40" style={{ color: '#2D0A00' }}>Vector + 3D-print versions both available from reference</p>
            </Section>
            <Section title="Brand Rules" accent="#B8E87A">
              <ul className="flex flex-col gap-2 text-sm" style={{ color: '#2D0A00' }}>
                <li>✅ <strong>Always</strong> use Fredoka One for the wordmark</li>
                <li>✅ <strong>Outline</strong> weight: thick dark brown (#2D0A00), never black</li>
                <li>✅ <strong>Piri</strong> is always lowercase in the logo</li>
                <li>✅ <strong>Flavors</strong> map 1:1 to payment methods — never break this</li>
                <li>✅ <strong>Background</strong> is always warm cream #FFFBF2 or a flavor color</li>
                <li>❌ Never use generic blue or purple gradients</li>
                <li>❌ Never use Inter, Roboto, or system fonts in brand materials</li>
              </ul>
            </Section>
          </div>
        )}

        {tab === 'flavors' && (
          <div className="grid gap-6">
            <Section title="Flavors = Payment Methods" accent="#FF6B9D">
              <p className="text-sm mb-5 opacity-60" style={{ color: '#2D0A00' }}>
                Each syrup flavor maps to a payment rail. Add a payment method in the app → unlock that flavor. The more methods, the more colorful Piri gets.
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {FLAVORS.map((f) => (
                  <div key={f.name} className="rounded-2xl p-4 border-2 flex gap-3 items-center" style={{ background: `${f.color}18`, borderColor: `${f.color}60` }}>
                    <div className="w-12 h-12 rounded-full flex-shrink-0 shadow-lg" style={{ background: f.color }} />
                    <div>
                      <p className="font-black text-base" style={{ color: '#2D0A00', fontFamily: "'Fredoka One', cursive" }}>{f.name}</p>
                      <p className="text-xs font-bold opacity-60" style={{ color: '#2D0A00' }}>{f.emoji} {f.method}</p>
                      <p className="text-xs opacity-40" style={{ color: '#2D0A00' }}>{f.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="The Rainbow Goal 🌈" accent="#C97BF5">
              <p className="text-sm leading-relaxed" style={{ color: '#2D0A00' }}>
                The ultimate gamification hook: <strong>connect all 6 payment methods = unlock Rainbow Piri.</strong> All layers lit up, cherry glowing, special animation plays. This is the app&apos;s north star engagement mechanic — visible on your profile so payees can see how &quot;stacked&quot; your Piri is.
              </p>
              <div className="mt-4 flex justify-center">
                <div className="flex gap-1">
                  {FLAVORS.map((f) => (
                    <div key={f.name} className="w-8 h-8 rounded-full shadow-md border-2 border-white" style={{ background: f.color }} />
                  ))}
                  <div className="w-8 h-8 rounded-full shadow-md border-2 border-white ml-1" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF9A3C, #FFE566, #7BC8F5, #B8E87A, #C97BF5)' }} />
                </div>
              </div>
              <p className="text-xs text-center mt-2 opacity-40" style={{ color: '#2D0A00' }}>6 flavors → Rainbow Piri ✨</p>
            </Section>
          </div>
        )}

        {tab === 'voice' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Taglines" accent="#FF9A3C">
              <div className="flex flex-col gap-3">
                <Tag text="Pick your flavor. Get your money." sub="Hero tagline — action + street energy" accent="#FF9A3C" />
                <Tag text="La piragua del pueblo." sub="Spanish-first — cultural pride" accent="#FF6B9D" />
                <Tag text="One scan. Every way to pay." sub="Feature-forward, clean" accent="#7BC8F5" />
                <Tag text="Sweet payments. No drama." sub="Gen Z / creator audience" accent="#B8E87A" />
                <Tag text="Know your worth. Piri's got your back." sub="Nods to the origin story" accent="#C97BF5" />
              </div>
            </Section>
            <Section title="Notification Voice" accent="#FF6B9D">
              <div className="flex flex-col gap-3">
                <Notif emoji="🍧" text="¡Qué rico! Maria paid you $40 USDC" sub="just now · tap to view" bg="#FF9A3C" />
                <Notif emoji="🌈" text="Coco unlocked! You added an ETH address 🩵" sub="New flavor activated" bg="#7BC8F5CC" />
                <Notif emoji="🎉" text="Rainbow Piri achieved! All 6 flavors active!" sub="You're fully stacked ✨" bg="#C97BF5" />
                <Notif emoji="📊" text="Piri says: Tuesday is your best day 👀" sub="Check your flavor breakdown" bg="#FF6B9D" />
              </div>
              <div className="mt-4 rounded-2xl p-3 border-2" style={{ borderColor: '#FF6B9D40', background: '#FF6B9D08' }}>
                <p className="text-xs font-black mb-1" style={{ color: '#2D0A00' }}>Voice rules</p>
                <p className="text-xs opacity-60" style={{ color: '#2D0A00' }}>Warm · celebratory · bilingual (Spanglish ok) · never corporate · always on Piri&apos;s side</p>
              </div>
            </Section>
          </div>
        )}

        {tab === 'universe' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="🧸 Merch Lineup" accent="#FF6B9D">
              <ul className="flex flex-col gap-2 text-sm" style={{ color: '#2D0A00' }}>
                {[
                  ['🧸', 'Piri plushie', 'Cup-shaped, squishy, layered fabric. First merch drop.'],
                  ['🔑', 'Enamel keychain', 'NFC chip inside — tap to open your Piri QR instantly.'],
                  ['📦', 'Die-cut sticker pack', 'One Piri per mood/flavor. Waterproof.'],
                  ['👕', 'Screen print tee', "'Pick your flavor' — barrio drop, limited colorways."],
                  ['🧢', 'Embroidered cap', 'Piri logo on chest. Flavor color brim.'],
                  ['🪡', 'Iron-on patch', 'For the denim jacket. Classic.'],
                ].map(([e, name, desc]) => (
                  <li key={name} className="flex gap-3 items-start rounded-xl p-2" style={{ background: '#FF6B9D0A' }}>
                    <span className="text-xl mt-0.5">{e}</span>
                    <div>
                      <p className="font-black text-sm" style={{ color: '#2D0A00' }}>{name}</p>
                      <p className="text-xs opacity-50" style={{ color: '#2D0A00' }}>{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="🎮 Gamification" accent="#B8E87A">
              <ul className="flex flex-col gap-2 text-sm" style={{ color: '#2D0A00' }}>
                {[
                  ['🍧', 'Add payment method', '→ unlock that flavor on your Piri'],
                  ['🌈', 'All 6 methods active', '→ Rainbow Piri unlocked'],
                  ['📊', 'Data viz', '→ pie/bar charts styled as piragua layers'],
                  ['🏆', 'Vendor rank', '→ Cart · Truck · Restaurant · Empire'],
                  ['✨', 'Piri moods', '→ expression changes with payment streaks'],
                  ['💌', 'Share your Piri', '→ your flavor stack is your payment identity'],
                ].map(([e, trigger, effect]) => (
                  <li key={trigger} className="rounded-xl p-2 flex gap-3 items-start" style={{ background: '#B8E87A15' }}>
                    <span className="text-lg">{e}</span>
                    <div>
                      <p className="font-black text-xs" style={{ color: '#2D0A00' }}>{trigger}</p>
                      <p className="text-xs opacity-50" style={{ color: '#2D0A00' }}>{effect}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="🎯 Target Audiences" accent="#7BC8F5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Gen Z & Students', desc: 'Venmo-native. Scannable at parties, dorms, markets.', emoji: '🎓' },
                  { label: 'Creators & Freelancers', desc: "One link for everything. No more 'what's your CashApp?'", emoji: '🎨' },
                  { label: 'IRL Vendors', desc: 'Print the QR. Tape it to your table. Done.', emoji: '🛒' },
                  { label: 'Crypto-curious', desc: 'Onboarding ramp — fiat first, crypto when ready.', emoji: '🔑' },
                ].map((a) => (
                  <div key={a.label} className="rounded-2xl p-3 border-2" style={{ borderColor: '#7BC8F540', background: '#7BC8F510' }}>
                    <p className="text-2xl mb-1">{a.emoji}</p>
                    <p className="font-black text-sm" style={{ color: '#2D0A00' }}>{a.label}</p>
                    <p className="text-xs opacity-50 leading-relaxed" style={{ color: '#2D0A00' }}>{a.desc}</p>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="🗺️ Roadmap" accent="#FF9A3C">
              <div className="flex flex-col gap-3">
                {[
                  { phase: 'Phase 1 · Now', label: 'Rebrand live', items: ['Rename repo → piri-pay', 'New color system', 'Piri mascot in app'] },
                  { phase: 'Phase 2 · Soon', label: 'Gamification', items: ['Flavor unlock system', 'Piri mood states', 'Payment breakdown chart as piragua'] },
                  { phase: 'Phase 3 · Later', label: 'Brand universe', items: ['Merch drop (stickers + keychain)', 'Piri plushie pre-order', 'Pitch deck for investors'] },
                ].map((r) => (
                  <div key={r.phase} className="rounded-2xl p-3 border-2" style={{ borderColor: '#FF9A3C40', background: '#FF9A3C0A' }}>
                    <p className="text-xs font-black opacity-40 uppercase tracking-wider" style={{ color: '#2D0A00' }}>{r.phase}</p>
                    <p className="font-black" style={{ color: '#2D0A00', fontFamily: "'Fredoka One', cursive" }}>{r.label}</p>
                    <ul className="mt-1">
                      {r.items.map((i) => (
                        <li key={i} className="text-xs opacity-60" style={{ color: '#2D0A00' }}>· {i}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>

      <p className="text-center text-xs opacity-20 mt-12 pb-4" style={{ color: '#2D0A00' }}>
        Piri · born in Puerto Rico · built for everybody 🇵🇷🍧
      </p>
    </div>
  );
}
