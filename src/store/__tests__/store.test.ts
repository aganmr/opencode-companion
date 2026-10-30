import AsyncStorage from '@react-native-async-storage/async-storage';
import sessionsReducer, {
  MAX_SESSIONS,
  addSession,
  clearSessions,
  removeSession,
} from '../sessionsSlice';
import serversReducer, {
  addServer,
  deleteServer,
  serverDisplayName,
  serverUrl,
  updateServer,
  type Server,
} from '../serversSlice';
import settingsReducer, {
  setAutoHidePill,
  setWebviewZoom,
} from '../settingsSlice';
import uiReducer, { serverSaved, serverSavedCleared } from '../uiSlice';
import { importLegacyState } from '../legacyMigration';
import { makeStore } from '../rootReducer';

// AsyncStorage is the in-memory mock from jest-setup.js; start each test clean.
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('sessions slice', () => {
  it('starts empty', () => {
    expect(sessionsReducer(undefined, { type: '@@INIT' })).toEqual([]);
  });

  it('saves a session', () => {
    let state = sessionsReducer(undefined, addSession({ url: 'http://a', connectedAt: 1 }));
    expect(state).toHaveLength(1);
    expect(state[0].url).toBe('http://a');
  });

  it('stores the server origin, not the one-time pairing path', () => {
    const state = sessionsReducer(
      undefined,
      addSession({ url: 'http://192.168.0.131:4096/auth/connect/abc123', connectedAt: 1 })
    );
    // Reconnects must load the server root so the 30-day session cookie
    // authenticates — a consumed pairing path can never work again.
    expect(state[0].url).toBe('http://192.168.0.131:4096');
  });

  it('dedupes a re-scan of the same server by its origin', () => {
    let state = sessionsReducer(
      undefined,
      addSession({ url: 'http://192.168.0.131:4096/auth/connect/aaa', connectedAt: 1 })
    );
    state = sessionsReducer(
      state,
      addSession({ url: 'http://192.168.0.131:4096/auth/connect/bbb', connectedAt: 2 })
    );
    expect(state).toHaveLength(1);
    expect(state[0].url).toBe('http://192.168.0.131:4096');
    expect(state[0].connectedAt).toBe(2);
  });

  it('keeps an unparseable url as-is', () => {
    const state = sessionsReducer(undefined, addSession({ url: 'not a url', connectedAt: 1 }));
    expect(state[0].url).toBe('not a url');
  });

  it('dedupes by url and keeps the most recent first', () => {
    let state = sessionsReducer(undefined, addSession({ url: 'http://a', connectedAt: 1 }));
    state = sessionsReducer(state, addSession({ url: 'http://b', connectedAt: 2 }));
    state = sessionsReducer(state, addSession({ url: 'http://a', connectedAt: 3 }));
    expect(state.map((s) => s.url)).toEqual(['http://a', 'http://b']);
    expect(state[0].connectedAt).toBe(3);
  });

  it(`caps the list at ${MAX_SESSIONS} sessions`, () => {
    let state = sessionsReducer(undefined, addSession({ url: 'http://a', connectedAt: 1 }));
    state = sessionsReducer(state, addSession({ url: 'http://b', connectedAt: 2 }));
    state = sessionsReducer(state, addSession({ url: 'http://c', connectedAt: 3 }));
    state = sessionsReducer(state, addSession({ url: 'http://d', connectedAt: 4 }));
    expect(state.map((s) => s.url)).toEqual(['http://d', 'http://c', 'http://b']);
  });

  it('removes a session', () => {
    let state = sessionsReducer(undefined, addSession({ url: 'http://a', connectedAt: 1 }));
    state = sessionsReducer(state, addSession({ url: 'http://b', connectedAt: 2 }));
    state = sessionsReducer(state, removeSession('http://a'));
    expect(state.map((s) => s.url)).toEqual(['http://b']);
  });

  it('removeSession for a missing url is a no-op', () => {
    const state = sessionsReducer(undefined, addSession({ url: 'http://a', connectedAt: 1 }));
    expect(sessionsReducer(state, removeSession('http://nope'))).toEqual(state);
  });

  it('clearSessions empties the list', () => {
    const state = sessionsReducer(undefined, addSession({ url: 'http://a', connectedAt: 1 }));
    expect(sessionsReducer(state, clearSessions())).toEqual([]);
  });
});

const sample: Server = {
  id: 'abc',
  name: "Mark's PC",
  scheme: 'http',
  host: '192.168.0.131',
  port: 4096,
  createdAt: 1000,
};

describe('servers slice', () => {
  it('starts empty', () => {
    expect(serversReducer(undefined, { type: '@@INIT' })).toEqual([]);
  });

  it('serverUrl builds scheme://host:port/', () => {
    expect(serverUrl(sample)).toBe('http://192.168.0.131:4096/');
  });

  it('serverDisplayName uses the name, falling back to host:port', () => {
    expect(serverDisplayName(sample)).toBe("Mark's PC");
    expect(serverDisplayName({ ...sample, id: 'x', name: '   ' })).toBe('192.168.0.131:4096');
  });

  it('addServer (ServerInput) appends, trimming name and host and minting an id', () => {
    let state = serversReducer(
      undefined,
      addServer({ name: ' A ', scheme: 'http', host: ' a.com ', port: 1 })
    );
    state = serversReducer(
      state,
      addServer({ name: '', scheme: 'https', host: 'b.com', port: 2 })
    );

    expect(state).toHaveLength(2);
    expect(state[0]).toMatchObject({ name: 'A', host: 'a.com' });
    expect(state[1]).toMatchObject({ name: '', host: 'b.com' });
    expect(state[0].id).not.toBe(state[1].id);
  });

  it('addServer (full Server) is kept as-is (legacy migration)', () => {
    const state = serversReducer(undefined, addServer(sample));
    expect(state).toEqual([sample]);
  });

  it('updateServer replaces the fields but keeps id and createdAt', () => {
    const [created] = serversReducer(
      undefined,
      addServer({ name: 'Old', scheme: 'http', host: 'old.com', port: 1 })
    );
    const next = serversReducer(
      [created],
      updateServer({
        id: created.id,
        input: { name: 'New', scheme: 'https', host: 'new.com', port: 8443 },
      })
    );

    expect(next).toHaveLength(1);
    const [s] = next;
    expect(s).toMatchObject({ name: 'New', scheme: 'https', host: 'new.com', port: 8443 });
    expect(s.id).toBe(created.id);
    expect(s.createdAt).toBe(created.createdAt);
  });

  it('deleteServer removes the server by id', () => {
    let state = serversReducer(undefined, addServer({ name: 'A', scheme: 'http', host: 'a.com', port: 1 }));
    const [a] = state;
    state = serversReducer(state, addServer({ name: 'B', scheme: 'http', host: 'b.com', port: 2 }));
    expect(state).toHaveLength(2);

    const next = serversReducer(state, deleteServer(a.id));
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe('B');
  });
});

describe('settings slice', () => {
  it('defaults: autoHidePill and webviewZoom are both true', () => {
    const state = settingsReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({ autoHidePill: true, webviewZoom: true });
  });

  it('setters flip their values independently', () => {
    let state = settingsReducer(undefined, setAutoHidePill(false));
    expect(state).toEqual({ autoHidePill: false, webviewZoom: true });
    state = settingsReducer(state, setWebviewZoom(false));
    expect(state).toEqual({ autoHidePill: false, webviewZoom: false });
  });
});

describe('ui slice', () => {
  it('starts with no save flag', () => {
    expect(uiReducer(undefined, { type: '@@INIT' })).toEqual({ lastServerSavedAt: 0 });
  });

  it('serverSaved stamps the given timestamp (reducer stays pure)', () => {
    const state = uiReducer(undefined, serverSaved(1234));
    expect(state).toEqual({ lastServerSavedAt: 1234 });
  });

  it('serverSavedCleared resets the flag', () => {
    let state = uiReducer(undefined, serverSaved(1234));
    state = uiReducer(state, serverSavedCleared());
    expect(state).toEqual({ lastServerSavedAt: 0 });
  });
});

describe('legacy migration (pre-Redux AsyncStorage keys)', () => {
  it('is a no-op when no legacy keys exist', async () => {
    const store = makeStore();
    await importLegacyState(store);
    expect(store.getState().sessions).toEqual([]);
    expect(store.getState().servers).toEqual([]);
    expect(store.getState().settings.autoHidePill).toBe(true);
  });

  it('imports legacy sessions (order preserved) and removes the key', async () => {
    await AsyncStorage.setItem(
      'opencode.companion.recent-sessions',
      JSON.stringify([
        { url: 'http://newest', connectedAt: 3 },
        { url: 'http://older', connectedAt: 2 },
      ])
    );

    const store = makeStore();
    await importLegacyState(store);

    expect(store.getState().sessions.map((s) => s.url)).toEqual([
      'http://newest',
      'http://older',
    ]);
    expect(await AsyncStorage.getItem('opencode.companion.recent-sessions')).toBeNull();
  });

  it('imports legacy servers (ids preserved) and the auto-hide setting', async () => {
    await AsyncStorage.setItem(
      'opencode.companion.saved-servers',
      JSON.stringify([sample])
    );
    await AsyncStorage.setItem('opencode.companion.auto-hide-pill', 'false');

    const store = makeStore();
    await importLegacyState(store);

    expect(store.getState().servers).toEqual([sample]);
    expect(store.getState().settings.autoHidePill).toBe(false);
    expect(await AsyncStorage.getItem('opencode.companion.saved-servers')).toBeNull();
    expect(await AsyncStorage.getItem('opencode.companion.auto-hide-pill')).toBeNull();
  });

  it('does not clobber slices that already have data (persisted state wins)', async () => {
    await AsyncStorage.setItem(
      'opencode.companion.recent-sessions',
      JSON.stringify([{ url: 'http://legacy', connectedAt: 1 }])
    );

    const store = makeStore({
      sessions: [{ url: 'http://current', connectedAt: 2 }],
    });
    await importLegacyState(store);

    expect(store.getState().sessions.map((s) => s.url)).toEqual(['http://current']);
    // The key is still removed so the migration never re-runs.
    expect(await AsyncStorage.getItem('opencode.companion.recent-sessions')).toBeNull();
  });

  it('tolerates corrupt legacy payloads', async () => {
    await AsyncStorage.setItem('opencode.companion.recent-sessions', '{not json');

    const store = makeStore();
    await importLegacyState(store);

    expect(store.getState().sessions).toEqual([]);
    expect(await AsyncStorage.getItem('opencode.companion.recent-sessions')).toBeNull();
  });
});
