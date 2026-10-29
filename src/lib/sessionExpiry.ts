/**
 * opencode web sessions (the cookie set when a pairing link is opened) last
 * 30 days from the moment of pairing. The app cannot read the cookie's real
 * expiry (react-native-webview has no cookie-read API and the server exposes
 * none), so it estimates from `connectedAt` — the time the session was paired.
 * If the server ever slides the expiry on activity, this estimate errs on the
 * safe side (suggests rescanning sooner than strictly needed).
 */
export const SESSION_TTL_DAYS = 30;

/** At or below this many days left the label turns amber. */
export const EXPIRY_SOON_DAYS = 7;

const DAY_MS = 86_400_000;

export type ExpiryState = 'ok' | 'soon' | 'expired';

export type Expiry = {
  daysLeft: number;
  state: ExpiryState;
};

/**
 * Convenience wrapper for render: hides the impure Date.now() read inside a
 * helper (same pattern as relativeTime), so the call site stays pure.
 */
export function sessionExpiryFor(connectedAt: number): Expiry {
  return sessionExpiry(connectedAt, Date.now());
}

export function sessionExpiry(connectedAt: number, now: number): Expiry {
  const daysLeft = Math.ceil((connectedAt + SESSION_TTL_DAYS * DAY_MS - now) / DAY_MS);
  if (daysLeft <= 0) {
    return { daysLeft: 0, state: 'expired' };
  }
  if (daysLeft <= EXPIRY_SOON_DAYS) {
    return { daysLeft, state: 'soon' };
  }
  return { daysLeft, state: 'ok' };
}

export function sessionExpiryLabel(expiry: Expiry): string {
  if (expiry.state === 'expired') {
    return 'expired — scan QR again';
  }
  if (expiry.daysLeft === 1) {
    return 'expires tomorrow';
  }
  return `expires in ${expiry.daysLeft} days`;
}
