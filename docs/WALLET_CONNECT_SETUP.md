# WalletConnect / Reown AppKit Setup

## Blank wallet cards (0 wallets, empty modal)

If the connect modal shows **0 wallets** or **blank cards**, the Reown API is likely returning 403 because your domain is not verified.

### Fix: Add your domain to Reown Dashboard

1. Go to [dashboard.reown.com](https://dashboard.reown.com/)
2. Select your project (or create one)
3. Open **Project Domains** (or **Configure Domains**)
4. Add these domains:
   - `https://fu-pay-me.vercel.app` (production)
   - `https://localhost:5173` (local dev, if needed)
   - Any other deploy preview URLs you use (e.g. `*.vercel.app` if supported)

5. Save and wait a few minutes for changes to propagate

### Why this happens

The AppKit fetches the wallet list from `api.web3modal.com`. That API rejects requests from origins not in your project's allowed domains list, returning 403 Forbidden. Without domain verification, the modal has no wallet data to display.

### Verify it works

After adding domains, refresh the app. The connect modal should show MetaMask, Trust Wallet, and other wallets.
