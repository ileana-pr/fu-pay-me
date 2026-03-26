/** short messages for the UI — full errors go to console.error only */

export function logClientError(context: string, ...data: unknown[]): void {
  console.error(`[piri] ${context}`, ...data);
}

/** profile POST/PUT / GET failures */
export function profileHttpUserMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Please check your payment details and try again.';
    case 401:
      return 'Your session expired. Please sign in again.';
    case 404:
      return "We couldn't find that profile.";
    case 503:
      return "We can't save your profile right now. Please try again in a few minutes.";
    default:
      return 'Something went wrong. Please try again.';
  }
}

/** magic link or oauth */
export function authEmailUserMessage(): string {
  return "We couldn't send that email. Check the address and try again.";
}

export function walletSignInUserMessage(): string {
  return "Couldn't sign in with your wallet. Please try again.";
}

export function tipPageLoadUserMessage(): string {
  return "This page couldn't be loaded. Check the link and try again.";
}

export function tipLinkInvalidUserMessage(): string {
  return "This link doesn't look valid. Ask the person who shared it to send it again.";
}

export function shareImageUserMessage(): string {
  return "Couldn't prepare the image. Please try again.";
}

/** solana RPC / blockhash / fetch failures */
export function solanaNetworkUserMessage(): string {
  return "Couldn't reach the Solana network from this device. Try again in a moment or switch networks (e.g. Wi‑Fi or mobile data).";
}
