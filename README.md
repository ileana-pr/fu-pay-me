# 🖕😎 FU Pay Me

> **One QR code. All payments.** I built this so you can unify fiat and crypto in a single link—one place for vendors, creators, or anyone getting paid to make life easier for everyone paying them.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-blue)](https://fu-payme.vercel.app)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)

## Backstory

This app was built on the fly at [Home Base](https://x.com/homebasedotlove) Denver 2026. It was my fourth ETH Denver, and I had a clear goal: land a full-time role in web3. After three years of studying, grinding, and building, my attitude was different from years past—when I'd been closer to begging for opportunity. This time I had paid my dues, and it was *FU Pay Me*.

I brought a handful of 3D-printed Ethereum keychains to sell for $10 USDC to help 
cover travel. Coordinating payments with so many people from different countries, 
chains, and apps turned into a real hassle—and that quickly became an idea. I wanted 
my supporters to pay me quickly and without fuss, especially at a conference where 
everyone's busy and on the run.

I was building the prototype so fast I didn't have time to think of a name. So I used *FU Pay Me* as a temporary placeholder. To my surprise, the other devs at Home Base loved it—and so did [Jesse](https://x.com/jessepollak) himself. So here we are. I hope you find it a useful little tool, and remember, know your worth... and have the confidence to say **respectfully** FU Pay Me, followed with a smile.

---

## ✨ What it does

**One profile, one QR code—every way you get paid.** No more handing out different links for Venmo, Cash App, and each crypto chain. You set your payment options once; anyone who scans your QR sees **all** of them in one place and pays with whatever they already use.

**If you’re getting paid:** You come to the app and create a profile—sign up, add your ETH, SOL, BTC (and other chain) addresses, plus Cash App, Venmo, Zelle. The app gives you one QR for everything.

**If someone’s paying you:** They scan your QR, see your payment page, pick fiat or crypto, and either get sent to the right app with details pre-filled or connect their wallet. After they pay, the app nudges them to make their own profile and QR so they can get paid the same way.

### Payment options (fiat + crypto in one place)

- 💵 **Fiat (what most people use every day)** — Cash App, Venmo, Zelle
- 🪙 **Crypto (all under the same QR)** — Ethereum (ETH & ERC-20), Base, Solana (SOL & SPL), Bitcoin (BTC via QR)

### For the person paying

One scan → one page with every option you accept. Fiat: they tap and land in Cash App, Venmo, or Zelle with details pre-filled. Crypto: they connect their wallet (MetaMask, Phantom, WalletConnect, etc.), choose amount, sign—no copy-pasting addresses. Domain names (like ENS) make addresses friendlier, but you still have to type or spell them; scanning a QR is scan-and-go. Works on mobile, deep links into apps, and scans from any phone camera.

The whole point: one QR so you don’t have to choose between fiat and crypto. Vendors get one link to print or share; payers get a simple flow. I’m focused on making paying and getting paid easier and onboarding as many people as possible—without locking anyone into one app or one chain.

## 📚 Docs

- **[Whitepaper](./docs/whitepaper.md)** — The full vision: one QR for all payment methods (fiat + crypto)

## 🚀 Quick start

You’ll need Node.js 18+ and npm or yarn.

### Run it locally

```bash
git clone git@github.com:ileana-pr/fu-pay-me.git
cd fu-pay-me
npm install
npm run dev
```

### Test on your phone (same WiFi)

```bash
npm run dev:mobile
```

Then open `http://YOUR_LOCAL_IP:5173` on your phone.


## 🛠️ Tech stack

React 18 + TypeScript, Vite, Tailwind. Ethereum/Base via Wagmi + Viem, Solana via @solana/wallet-adapter, Bitcoin QR generation. Nothing fancy—just stuff that works.

## 🎯 Scripts

```bash
npm run dev          # Dev server (localhost)
npm run dev:mobile   # Dev server (same WiFi, for phone)
npm run build        # Production build
npm run preview      # Preview the build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

## 🌐 Env vars

Drop a `.env` in the project root with your addresses and handles (or leave optional ones blank):

```env
VITE_ETH_ADDRESS=your_ethereum_address
VITE_SOL_ADDRESS=your_solana_address
VITE_BTC_ADDRESS=your_bitcoin_address
VITE_SOLANA_ENDPOINT=https://api.devnet.solana.com
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_CASHAPP_HANDLE=your_cashapp_handle
VITE_VENMO_HANDLE=your_venmo_handle
VITE_ZELLE_HANDLE=your_zelle_email_or_phone
```

## 📝 License

Private and proprietary.

## 👤

**Ileana Perez** — (https://linktr.ee/adigitaltati)

Stars are always appreciated if you find it useful. 🖕😎
