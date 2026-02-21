# WalletConnect / Reown Setup (RainbowKit)

RainbowKit works on **mobile the same as desktop**: connect, pay, and switch chains. Mobile users typically connect via WalletConnect (scan QR or open in wallet). No special code is required; you only need the correct **project ID** and **domain allowlist** so the wallet list and icons load.

## Mobile = desktop: what you need

1. **Project ID**  
   Get a free [Project ID from Reown (WalletConnect) Cloud](https://cloud.walletconnect.com/) and set it as **`VITE_WALLETCONNECT_PROJECT_ID`** in:
   - **Vercel**: Project → Settings → Environment Variables (for Production and Preview if you use them).
   - **Local**: `.env.local` with `VITE_WALLETCONNECT_PROJECT_ID=your_project_id`.  
   Rebuild/redeploy after adding the variable. Without it, WalletConnect and the explorer wallet list cannot load (blank or empty modal).

2. **Domain allowlist**  
   In [Reown Dashboard](https://dashboard.reown.com/) → your project → **Domain** (or **Project Domains**) → add the **exact origin** your app is served from:
   - Production: `https://fu-payme.vercel.app` (no path, no trailing slash)
   - Optional: `fu-payme.vercel.app` (no scheme)  
   The browser sends the [Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin) header; Reown rejects requests from origins not on the list (403 → blank tiles). On mobile, opening your link in **Chrome or Safari** sends the same origin as desktop. In-app browsers (e.g. from social apps) can send a different or empty origin — for best results, open the tip link in the device’s main browser.

3. **No custom wallet list**  
   Use RainbowKit’s default config (no `wallets` override) so the full wallet list and WalletConnect flow come from the Explorer API. Connect and pay on mobile works the same as on desktop once the project ID and domain are set.

References: [RainbowKit Installation](https://rainbowkit.com/en-US/docs/installation) (projectId), [Reown Relay – Allowlist](https://docs.reown.com/cloud/relay#allowlist).

---

## Blank wallet cards (0 wallets, empty modal)

If the connect modal shows **0 wallets** or **blank cards**, the Reown API is likely returning 403 because your domain is not verified.

### Fix: Add your domain to Reown Dashboard

1. Go to [dashboard.reown.com](https://dashboard.reown.com/)
2. Select your project (or create one)
3. Open **Project Domains** (or **Configure Domains**)
4. Add these domains:
   - `https://fu-payme.vercel.app` (production)
   - `https://localhost:5173` (local dev, if needed)
   - Any other deploy preview URLs you use (e.g. `*.vercel.app` if supported)

5. Save and wait a few minutes for changes to propagate

### Why this happens

The wallet list comes from Reown’s Explorer API. Requests from origins that aren’t in your project’s **Project Domains** allowlist are rejected (403). No allowlist → no wallet data → empty modal.

Same URL can still behave differently on mobile if the browser sends a different `Origin` (e.g. some in-app browsers or redirects), or if the request fails for network/CORS. Allowlist the exact origin you use (e.g. `https://fu-payme.vercel.app` with no trailing slash).

### If it works on desktop but not on mobile

1. On your phone, open the app and tap “Connect wallet” so the modal loads.
2. **No USB?** Open the app with `?debug=1` (e.g. `https://fu-payme.vercel.app?debug=1`). A green tab appears at the bottom; tap it to open an on-device console and look for `[Explorer API]`.
3. Or use **remote debugging** (USB + computer): iOS → Safari Develop menu; Android → Chrome `chrome://inspect`.
4. In the console, look for `[Explorer API]` — it logs `status`, `origin`, and `isMobile`.
   - **403**: Add that exact `origin` in Reown Dashboard → Project Domains (updates can take ~15 min).
   - **200** but you see **"failed to fetch remote project configuration"** or **"failed to fetch usage"**: AppKit calls several Reown APIs (explorer, project config, usage). The explorer can return 200 while project config/usage still reject the request on mobile (same allowlist, different endpoint). **Fix:** In [Reown Dashboard](https://dashboard.reown.com/) → your project → **Project Domains** → Configure Domains, add **both** `https://fu-payme.vercel.app` and `fu-payme.vercel.app` (no scheme). Save and wait ~15 min, then try again on mobile.
   - **200** and no config/usage errors but still empty: version mismatch or relay; ensure all `@reown/*` packages share the same version.

### 403 from wallet list (fetchWallets / fetchWalletsByPage)

If the console shows **Uncaught (in promise) … "HTTP status code: 403"** and the stack mentions `fetchWallets` or `fetchWalletsByPage`, the wallet-list request is being rejected. Our probe can still return 200 if it hits a different endpoint or timing. If your domain is already allowlisted for hours, add `https://fu-payme.vercel.app/` (trailing slash) and contact [Reown support](https://discord.gg/reown) (#developers-forum) with: “403 on fetchWallets/fetchWalletsByPage on mobile; origin allowlisted (fu-payme.vercel.app and https://fu-payme.vercel.app) for hours.” 
### Verify it works

After setting the project ID (and redeploying) and adding domains, refresh the app. The connect modal should show the full wallet list and WalletConnect flow on both desktop and mobile.
