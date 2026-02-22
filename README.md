# 💰 Tip Me

> **One QR code. All your payments.** Unify fiat and crypto in a single link—so vendors, creators, and anyone getting paid can make everyday life easier for everyone paying them.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-blue)](https://tip-me-ten.vercel.app)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)

## ✨ What Tip Me Does

**One profile, one QR code—every way you get paid.** No more handing out different links for Venmo, Cash App, and each crypto chain. Set your payment options once; anyone who scans your QR sees **all** of them in one place and pays with whatever they already use.

### Payment options (fiat + crypto in one place)

- 💵 **Fiat (what most people use every day)**
  - Cash App
  - Venmo
  - Zelle

- 🪙 **Crypto (all under the same QR)**
  - Ethereum (ETH & ERC-20 tokens)
  - Base (ETH & tokens on Base)
  - Solana (SOL & SPL tokens)
  - Bitcoin (BTC via QR)

### How it works for payers

- **One scan** → one page with every option the recipient accepts
- **Fiat**: tap and jump into Cash App, Venmo, or Zelle with details pre-filled
- **Crypto**: connect wallet (MetaMask, Phantom, WalletConnect, etc.), choose amount, sign—no copy-pasting addresses
- **Mobile-friendly**: responsive layout, deep links into payment apps, works from any phone camera

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone git@github.com:ileana-pr/tip-me.git

# Navigate to the project
cd tip-me

# Install dependencies
npm install

# Start development server
npm run dev
```

### Mobile Testing

To test on your mobile device (same WiFi network):

```bash
npm run dev:mobile
```

Then open `http://YOUR_LOCAL_IP:5173` on your phone.

**Why it matters:** Combining every payment option into a single QR benefits everyone—vendors and businesses get one link to print or share, and payers (crypto or not) get a simple, familiar flow. The goal is to make paying and getting paid easier and to onboard as many people as possible, without forcing anyone into one app or one chain.

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Ethereum / Base**: Wagmi + Viem
- **Solana**: @solana/wallet-adapter
- **Bitcoin**: QR code generation

## 📚 Documentation

- **[docs/whitepaper.md](./docs/whitepaper.md)** - Full product vision: one QR for all payment methods (fiat + crypto)
- **[docs/DEPLOY.md](./docs/DEPLOY.md)** - Deployment (e.g. Vercel)
- **[docs/MOBILE_TESTING.md](./docs/MOBILE_TESTING.md)** - Testing on mobile devices

## 🎯 Available Scripts

```bash
npm run dev          # Start dev server (localhost only)
npm run dev:mobile   # Start dev server (network accessible)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Type check with TypeScript
```

## 🌐 Environment Variables

Create a `.env` file in the root directory:

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

This project is private and proprietary.

## 👤 Author

**ileana-pr**

---

⭐ If you find this project helpful, consider giving it a star!
