import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import { HomeScreen } from '../HomeScreen';
import { theme } from '../../theme';
import { makeStore } from '../../store/rootReducer';
import { serverSaved } from '../../store/uiSlice';
import type { Server } from '../../store/serversSlice';

// Shared navigation spies (the `mock` prefix is required for jest.mock
// hoisting). `addListener` mirrors the native-stack API; registered 'focus'
// listeners can be fired manually to simulate regaining focus.
const mockNavigate = jest.fn();
const focusListeners: (() => void)[] = [];
const mockAddListener = jest.fn((event: string, listener: () => void) => {
  if (event === 'focus') {
    focusListeners.push(listener);
  }
  return () => {
    const i = focusListeners.indexOf(listener);
    if (i >= 0) {
      focusListeners.splice(i, 1);
    }
  };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, addListener: mockAddListener }),
}));

function fireFocus() {
  [...focusListeners].forEach((l) => l());
}

// Vector icons load a font asset in componentDidMount, which is unavailable
// under Jest. Replace them with a plain Text carrying a stable testID. Both the
// package root (SessionCard) and the subpath react-native-paper uses (default
// export) must be mocked, or the real font-loading module loads.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MaterialCommunityIcons: ({ name, testID }: { name: string; testID?: string }) =>
      React.createElement(Text, { testID: testID || `icon-${name}` }, name),
    __esModule: true,
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, testID }: { name: string; testID?: string }) =>
    React.createElement(Text, { testID: testID || `icon-${name}` }, name);
  return { default: Icon, __esModule: true };
});

// Deterministic seed data, mirroring the real slice shapes.
const seedSessions = [
  { url: 'http://a', connectedAt: 1000 },
  { url: 'http://b', connectedAt: 2000 },
];
const seedServers: Server[] = [
  { id: 's1', name: 'Alpha', scheme: 'http', host: '192.168.0.131', port: 4096, createdAt: 1000 },
  { id: 's2', name: '', scheme: 'https', host: 'example.com', port: 8443, createdAt: 2000 },
];

// A real (non-persisted) store seeded with the data above — the screen reads
// and dispatches against it exactly as it does in the app.
function makeSeededStore() {
  return makeStore({
    sessions: seedSessions,
    servers: seedServers,
  });
}

// RNTL 14: render() is async — renderHome returns a promise the tests must await.
function renderHome(store = makeSeededStore()) {
  return render(
    <Provider store={store}>
      <PaperProvider theme={theme}>
        <HomeScreen />
      </PaperProvider>
    </Provider>
  );
}

describe('HomeScreen recent sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the recent session cards', async () => {
    await renderHome();
    const cards = await screen.findAllByTestId('session-card');
    expect(cards).toHaveLength(2);
  });

  it('long-press reveals copy + delete for that card only', async () => {
    await renderHome();
    const cards = await screen.findAllByTestId('session-card');
    // No action buttons before a long press.
    expect(screen.queryByTestId('session-copy')).toBeNull();
    expect(screen.queryByTestId('session-delete')).toBeNull();

    await fireEvent(cards[0], 'longPress');
    // Exactly one of each now, for the long-pressed card.
    expect(screen.getAllByTestId('session-copy')).toHaveLength(1);
    expect(screen.getAllByTestId('session-delete')).toHaveLength(1);
  });

  it('copy puts the whole url on the clipboard and shows a snackbar', async () => {
    await renderHome();
    const cards = await screen.findAllByTestId('session-card');

    await fireEvent(cards[0], 'longPress');
    await fireEvent.press(screen.getByTestId('session-copy'));

    expect(Clipboard.setString).toHaveBeenCalledWith('http://a');
    expect(await screen.findByTestId('copied-snackbar')).toBeTruthy();
    expect(screen.getByText('URL copied to clipboard')).toBeTruthy();
    // Copying does not remove the session.
    expect(screen.getAllByTestId('session-card')).toHaveLength(2);
  });

  it('confirm dialog deletes the session in the store', async () => {
    const store = makeSeededStore();
    await renderHome(store);
    const cards = await screen.findAllByTestId('session-card');

    await fireEvent(cards[0], 'longPress');
    await fireEvent.press(screen.getByTestId('session-delete'));

    // Confirmation dialog appears.
    expect(await screen.findByText('Delete session?')).toBeTruthy();

    // Confirm. The active card also shows a "Delete" pill; the dialog's
    // button is the last one in the tree.
    const deletes = screen.getAllByText('Delete');
    await fireEvent.press(deletes[deletes.length - 1]);

    // The store lost the session and the card is gone.
    expect(store.getState().sessions).toHaveLength(1);
    expect(store.getState().sessions[0].url).toBe('http://b');
    expect(screen.queryByTestId('session-delete')).toBeNull();
    expect(screen.getAllByTestId('session-card')).toHaveLength(1);
  });

  it('cancel dismisses the dialog and keeps the session', async () => {
    const store = makeSeededStore();
    await renderHome(store);
    const cards = await screen.findAllByTestId('session-card');

    await fireEvent(cards[0], 'longPress');
    await fireEvent.press(screen.getByTestId('session-delete'));
    expect(await screen.findByText('Delete session?')).toBeTruthy();

    await fireEvent.press(screen.getByText('Cancel'));

    // Cancel must not delete: the store is untouched and the session stays.
    // (We don't assert the dialog text disappears — paper's Modal unmounts its
    // children only after a 220ms hide animation completes, which never runs
    // under Jest, so the text lingers in the hidden tree.)
    expect(store.getState().sessions).toHaveLength(2);
    expect(screen.getAllByTestId('session-card')).toHaveLength(2);
  });
});

describe('HomeScreen "Server saved" snackbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the snackbar when focused right after a save, and consumes the flag', async () => {
    const store = makeSeededStore();
    await renderHome(store);
    expect(screen.queryByTestId('server-saved-snackbar')).toBeNull();

    // Async act: sync act() does not flush react-redux subscription updates
    // in this React 19 + Jest setup (and leaking unflushed act state breaks
    // every later test in the suite).
    await act(async () => {
      store.dispatch(serverSaved(Date.now()));
    });
    await act(async () => {
      fireFocus();
    });

    expect(screen.getByText('Server saved')).toBeTruthy();
    // The flag is cleared so the snackbar cannot re-trigger on a later focus.
    expect(store.getState().ui.lastServerSavedAt).toBe(0);
  });

  it('does not show the snackbar when the save flag is stale', async () => {
    const stale = Date.now() - 60_000; // older than the 10 s freshness window
    const store = makeStore({
      sessions: seedSessions,
      servers: seedServers,
      ui: { lastServerSavedAt: stale },
    });
    await renderHome(store);

    // RNTL 14's act() always returns a thenable — it must be awaited,
    // otherwise the open act scope corrupts every later render in the file.
    await act(async () => {
      fireFocus();
    });

    expect(screen.queryByTestId('server-saved-snackbar')).toBeNull();
    expect(store.getState().ui.lastServerSavedAt).toBe(stale);
  });

  it('does not show the snackbar on plain focus without a recent save', async () => {
    await renderHome();
    await act(async () => {
      fireFocus();
    });
    expect(screen.queryByTestId('server-saved-snackbar')).toBeNull();
  });
});

describe('HomeScreen session expiry labels', () => {
  it('shows the estimated expiry next to the time-ago on fresh sessions', async () => {
    const store = makeStore({
      sessions: [{ url: 'http://a', connectedAt: Date.now() }],
    });
    await renderHome(store);
    expect(screen.getByText(' · expires in 30 days')).toBeTruthy();
  });

  it('shows the expired label for sessions past their 30 days', async () => {
    const store = makeStore({
      sessions: [{ url: 'http://a', connectedAt: Date.now() - 31 * 86_400_000 }],
    });
    await renderHome(store);
    expect(screen.getByText(' · expired — scan QR again')).toBeTruthy();
  });
});

describe('HomeScreen manual URL entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Enter Manual URL button (official, not dev-gated)', async () => {
    await renderHome();
    expect(screen.getByTestId('enter-manual-url')).toBeTruthy();
    expect(screen.queryByTestId('dev-open-url')).toBeNull();
  });

  it('opens the AddServer screen', async () => {
    await renderHome();
    await fireEvent.press(screen.getByTestId('enter-manual-url'));
    expect(mockNavigate).toHaveBeenCalledWith('AddServer', {});
  });
});

describe('HomeScreen footer layout', () => {
  it('shows "or" between Enter Manual URL and Scan QR Code', async () => {
    await renderHome();
    expect(screen.getByText('or')).toBeTruthy();
    expect(screen.getByTestId('enter-manual-url')).toBeTruthy();
    expect(screen.getByTestId('scan-button')).toBeTruthy();
  });
});

describe('HomeScreen saved servers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a card per saved server (name falls back to host:port)', async () => {
    await renderHome();
    const cards = await screen.findAllByTestId('server-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('example.com:8443')).toBeTruthy();
  });

  it('long-press reveals edit + delete for that card only', async () => {
    await renderHome();
    const cards = await screen.findAllByTestId('server-card');
    expect(screen.queryByTestId('server-edit')).toBeNull();
    expect(screen.queryByTestId('server-delete')).toBeNull();

    await fireEvent(cards[0], 'longPress');
    expect(screen.getAllByTestId('server-edit')).toHaveLength(1);
    expect(screen.getAllByTestId('server-delete')).toHaveLength(1);
  });

  it('tapping a server card opens its URL in the Connect screen', async () => {
    await renderHome();
    const cards = await screen.findAllByTestId('server-card');
    await fireEvent.press(cards[1]); // s2: https://example.com:8443/
    expect(mockNavigate).toHaveBeenCalledWith('Connect', { url: 'https://example.com:8443/' });
  });

  it('confirm dialog deletes the server from the store', async () => {
    const store = makeSeededStore();
    await renderHome(store);
    const cards = await screen.findAllByTestId('server-card');

    await fireEvent(cards[0], 'longPress');
    await fireEvent.press(screen.getByTestId('server-delete'));
    expect(await screen.findByText('Delete server?')).toBeTruthy();

    // The card in edit mode also shows a "Delete" pill; the dialog's button
    // is the last one in the tree.
    const deletes = screen.getAllByText('Delete');
    await fireEvent.press(deletes[deletes.length - 1]);

    expect(store.getState().servers).toHaveLength(1);
    expect(store.getState().servers[0].id).toBe('s2');
    expect(screen.getAllByTestId('server-card')).toHaveLength(1);
  });
});

describe('HomeScreen settings entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the Settings screen from the header gear icon', async () => {
    await renderHome();
    await fireEvent.press(screen.getByTestId('settings-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Settings');
  });
});

describe('HomeScreen scan button size', () => {
  it('renders the scan button 18% shorter than 56dp (46dp content height)', async () => {
    await renderHome();
    const btn = screen.getByTestId('scan-button');
    // contentStyle lands on a host View inside the paper button — collect all
    // numeric heights in the button's host subtree.
    type JsonNode = {
      props?: { style?: StyleProp<ViewStyle> };
      children?: (JsonNode | string)[];
    };
    const heights: number[] = [];
    const walk = (n: JsonNode | string | null) => {
      if (!n || typeof n === 'string') {
        return;
      }
      const h = StyleSheet.flatten(n.props?.style)?.height;
      if (typeof h === 'number') {
        heights.push(h);
      }
      n.children?.forEach(walk);
    };
    walk(btn.toJSON() as unknown as JsonNode);
    expect(heights).toContain(46);
    expect(heights).not.toContain(56);
  });
});
