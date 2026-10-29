import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Store } from '@reduxjs/toolkit';
import { setAutoHidePill } from './settingsSlice';
import { addSession, type Session } from './sessionsSlice';
import { addServer, type Server } from './serversSlice';
import type { RootState } from './rootReducer';

/** The pre-Redux AsyncStorage layout, one key per data set. */
const LEGACY_KEYS = {
  sessions: 'opencode.companion.recent-sessions',
  servers: 'opencode.companion.saved-servers',
  autoHidePill: 'opencode.companion.auto-hide-pill',
} as const;

function parseList<T>(raw: string | null): T[] {
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * One-time migration from the pre-Redux AsyncStorage layout. Reads the old
 * keys, imports them into the store (a slice is only imported when it is
 * currently empty, so persisted Redux state always wins), then removes the
 * legacy keys. Must run AFTER rehydration so the imported values are
 * persisted in their turn.
 */
export async function importLegacyState(store: Store<RootState>): Promise<void> {
  const [sessionsRaw, serversRaw, autoHideRaw] = await Promise.all([
    AsyncStorage.getItem(LEGACY_KEYS.sessions),
    AsyncStorage.getItem(LEGACY_KEYS.servers),
    AsyncStorage.getItem(LEGACY_KEYS.autoHidePill),
  ]);
  if (sessionsRaw === null && serversRaw === null && autoHideRaw === null) {
    return;
  }

  const state = store.getState();

  if (sessionsRaw !== null && state.sessions.length === 0) {
    // The legacy list is most-recent-first; addSession prepends, so import
    // oldest-first to keep the order intact.
    for (const session of parseList<Session>(sessionsRaw).reverse()) {
      store.dispatch(addSession(session));
    }
  }

  if (serversRaw !== null && state.servers.length === 0) {
    for (const server of parseList<Server>(serversRaw)) {
      // Full Server payload (not ServerInput) keeps the original id/createdAt.
      store.dispatch(addServer(server));
    }
  }

  if (autoHideRaw !== null) {
    store.dispatch(setAutoHidePill(autoHideRaw === 'true'));
  }

  // Drop every legacy key that existed, even the ones we skipped importing,
  // so the migration never runs twice.
  await Promise.all([
    sessionsRaw !== null && AsyncStorage.removeItem(LEGACY_KEYS.sessions),
    serversRaw !== null && AsyncStorage.removeItem(LEGACY_KEYS.servers),
    autoHideRaw !== null && AsyncStorage.removeItem(LEGACY_KEYS.autoHidePill),
  ]);
}
