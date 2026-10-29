import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Session = {
  url: string;
  connectedAt: number;
};

export const MAX_SESSIONS = 2;

/**
 * Reduce any URL to its server origin (scheme://host:port). opencode's
 * pairing links are one-time and expire in 5 minutes — what keeps you signed
 * in for 30 days is the session cookie set on the first pair. So a session
 * stores the server root, and every reconnect loads that root and lets the
 * retained cookie authenticate. Re-loading a consumed pairing path can never
 * work.
 */
export function toOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/** Recent sessions, most recent first (capped at MAX_SESSIONS). */
const sessionsSlice = createSlice({
  name: 'sessions',
  initialState: [] as Session[],
  reducers: {
    /** Prepend a session, dedupe by url, keep only the most recent MAX_SESSIONS. */
    addSession(state, action: PayloadAction<Session>) {
      const session = { ...action.payload, url: toOrigin(action.payload.url) };
      return [
        session,
        ...state.filter((s) => s.url !== session.url),
      ].slice(0, MAX_SESSIONS);
    },
    removeSession(state, action: PayloadAction<string>) {
      return state.filter((s) => s.url !== action.payload);
    },
    /** Remove all recent sessions (Settings screen). */
    clearSessions() {
      return [];
    },
  },
});

export const { addSession, removeSession, clearSessions } = sessionsSlice.actions;
export default sessionsSlice.reducer;
