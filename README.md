<div align="center">
  <img src="public/og-image.png" alt="Piri Pay" width="500" />
</div>

<div align="center">

**One QR code, every way to pay—unify fiat and crypto in a single link.**

</div>

# Piri Pay

<div align="center">

> 🍧 **[▶ Try the live demo](https://piri-pay.vercel.app/)** — *Pick your flavors. Get paid.* 🍧

</div>

## 📚 Docs

- [Whitepaper](./docs/whitepaper.md) — Vision and scope
- [Pitch deck](https://docs.google.com/presentation/d/1kJRNfmxq34ETlp5K4XRwvQBAp-Hb-KEN/edit?usp=sharing&ouid=114728018986311301124&rtpof=true&sd=true)

## ✨ What it does

**One profile, one QR—every way you get paid.** Set your payment options once; anyone who scans your QR sees all of them and pays with whatever they already use.

### 💵 Payment options

| 💵 Fiat | 🪙 Crypto |
|---------|-----------|
| Cash App | Ethereum (ETH & ERC-20) |
| Venmo | Base |
| Zelle | Solana (SOL & SPL) |
| | Bitcoin (BTC via QR) |

**📥 Getting paid:** Create a profile, add addresses and handles (ETH, SOL, BTC, Base, Cash App, Venmo, Zelle). The app gives you one QR and one link.

**📤 Paying someone:** Scan their QR → one page with every option they accept. Fiat: tap and land in Cash App, Venmo, or Zelle with details pre-filled. Crypto: connect wallet (MetaMask, Phantom, WalletConnect), choose amount, sign. Works on mobile and deep links into apps.

## 🚀 Quick start

Node.js 18+ and npm or yarn.

```bash
git clone git@github.com:ileana-pr/piri.git
cd piri
npm install
npm run dev
```

**📱 Test on your phone (same WiFi):** `npm run dev:mobile`, then open `http://YOUR_LOCAL_IP:5173` on your phone.

## 🛠️ Tech stack

React 18, TypeScript, Vite, Tailwind. Ethereum/Base: Wagmi + Viem. Solana: @solana/wallet-adapter. Bitcoin: QR + copy. No backend required for the MVP.

## 📋 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (localhost) |
| `npm run dev:mobile` | Dev server (LAN, for phone testing) |
| `npm run build` | Production build |
| `npm run preview` | Preview the build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run supabase:setup` | Interactive Supabase project setup (CLI) |
| `npm run supabase:login` | Log in to Supabase |
| `npm run supabase:link` | Link to a Supabase project |
| `npm run supabase:db` | Push migrations to linked project |
| `npm run supabase:start` | Start local Supabase (Docker) |

## 🗄️ Supabase (profile API)

Stable tip links require a Supabase project. Set up via CLI:

```bash
npm run supabase:setup
```

Or manually: `supabase login` → create project at [dashboard](https://supabase.com/dashboard) → `supabase link --project-ref <id>` → `supabase db push`.

Add to `.env`:
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from dashboard → Settings → API>
```

## 🌐 Env vars

Optional. Add a `.env` in the project root (leave blank if you don’t need them):

```env
VITE_ETH_ADDRESS=
VITE_SOL_ADDRESS=
VITE_BTC_ADDRESS=
VITE_SOLANA_ENDPOINT=https://api.devnet.solana.com
VITE_WALLETCONNECT_PROJECT_ID=
VITE_CASHAPP_HANDLE=
VITE_VENMO_HANDLE=
VITE_ZELLE_HANDLE=

# profile api (stable links)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## 📝 License

Private and proprietary.

---

**👤 Ileana Perez** — [linktr.ee/adigitaltati](https://linktr.ee/adigitaltati) · 🍧
