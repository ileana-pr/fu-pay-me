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
- [Pitch deck](https://docs.google.com/presentation/d/1kJRNfmxq34ETlp5K4XRwvQBAp-Hb-KEN/edit?slide=id.p1#slide=id.p1) *(WIP)*

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
```

## 📝 License

Private and proprietary.

---

**👤 Ileana Perez** — [linktr.ee/adigitaltati](https://linktr.ee/adigitaltati) · 🍧
