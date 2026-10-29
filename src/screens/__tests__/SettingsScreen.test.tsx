import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import { SettingsScreen } from '../SettingsScreen';
import { theme } from '../../theme';
import pkg from '../../../package.json';
import { makeStore } from '../../store/rootReducer';

// Navigation spies (the `mock` prefix is required for jest.mock hoisting).
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// Vector icons load a font asset in componentDidMount, which is unavailable
// under Jest. Replace them with a plain Text carrying a stable testID.
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

// Linking: record opens, never throw.
const mockOpenURL = jest.fn().mockResolvedValue(undefined);
jest.spyOn(Linking, 'openURL').mockImplementation((url: string) => mockOpenURL(url));

// A real (non-persisted) store; seed data is passed per test.
function renderSettings(preloaded?: Parameters<typeof makeStore>[0]) {
  const store = makeStore(preloaded);
  return {
    store,
    render: render(
      <Provider store={store}>
        <PaperProvider theme={theme}>
          <SettingsScreen />
        </PaperProvider>
      </Provider>
    ),
  };
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all sections and rows', async () => {
    await renderSettings().render;
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('ABOUT')).toBeTruthy();
    expect(screen.getByText('PREFERENCES')).toBeTruthy();
    expect(screen.getByText('DATA')).toBeTruthy();
    expect(screen.getByText('LINKS')).toBeTruthy();
    expect(screen.getByText('DONATE')).toBeTruthy();
    expect(screen.getByText('Version')).toBeTruthy();
    expect(screen.getByText('Auto-hide Connected pill')).toBeTruthy();
    expect(screen.getByText('Zoom in WebView')).toBeTruthy();
    expect(screen.getByText('Clear recent sessions')).toBeTruthy();
    expect(screen.getByText('Remove all saved servers')).toBeTruthy();
    expect(screen.getByText('opencode documentation')).toBeTruthy();
    expect(screen.getByText('Report an issue')).toBeTruthy();
    expect(screen.getByText('Buy me a coffee')).toBeTruthy();
  });

  it('shows the package.json version', async () => {
    await renderSettings().render;
    expect(screen.getByText(pkg.version)).toBeTruthy();
  });

  it('states the app is an unofficial companion', async () => {
    await renderSettings().render;
    expect(
      screen.getByText(/unofficial companion app for opencode/i)
    ).toBeTruthy();
  });

  it('ends the coffee sub-text with a wink emoji', async () => {
    await renderSettings().render;
    expect(screen.getByText(/with a coffee. 😉/)).toBeTruthy();
  });

  it('opens the coffee snackbar when Buy me a coffee is tapped', async () => {
    await renderSettings().render;
    expect(screen.queryByTestId('coming-soon-snackbar')).toBeNull();

    await fireEvent.press(screen.getByTestId('buy-me-a-coffee'));
    expect(screen.getByTestId('coming-soon-snackbar')).toBeTruthy();
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });

  it('defaults the zoom switch to on and persists its toggle in the store', async () => {
    const { store, render: r } = renderSettings();
    await r;
    const sw = screen.getByTestId('webview-zoom-switch');
    expect(sw.props.value).toBe(true);

    await fireEvent(sw, 'valueChange', false);
    expect(store.getState().settings.webviewZoom).toBe(false);

    await fireEvent(sw, 'valueChange', true);
    expect(store.getState().settings.webviewZoom).toBe(true);
  });

  it('persists the auto-hide pill switch in the store', async () => {
    const { store, render: r } = renderSettings();
    await r;
    const sw = screen.getByTestId('auto-hide-pill-switch');
    expect(sw.props.value).toBe(true);

    await fireEvent(sw, 'valueChange', false);
    expect(store.getState().settings.autoHidePill).toBe(false);

    await fireEvent(sw, 'valueChange', true);
    expect(store.getState().settings.autoHidePill).toBe(true);
  });

  it('clears recent sessions after confirmation', async () => {
    const { store, render: r } = renderSettings({
      sessions: [{ url: 'http://a', connectedAt: 1 }],
    });
    expect(store.getState().sessions).toHaveLength(1);

    await r;
    await fireEvent.press(screen.getByTestId('clear-sessions'));
    expect(await screen.findByText('Clear recent sessions?')).toBeTruthy();

    await fireEvent.press(screen.getByText('Clear'));
    expect(store.getState().sessions).toHaveLength(0);
  });

  it('cancelling the clear dialog keeps the data', async () => {
    const { store, render: r } = renderSettings({
      servers: [
        { id: 's1', name: 'A', scheme: 'http', host: 'h', port: 1, createdAt: 1 },
      ],
    });
    expect(store.getState().servers).toHaveLength(1);

    await r;
    await fireEvent.press(screen.getByTestId('clear-servers'));
    expect(await screen.findByText('Remove all saved servers?')).toBeTruthy();

    await fireEvent.press(screen.getByText('Cancel'));
    expect(store.getState().servers).toHaveLength(1);
  });

  it('opens the docs and issue tracker URLs', async () => {
    await renderSettings().render;
    await fireEvent.press(screen.getByTestId('open-docs'));
    expect(mockOpenURL).toHaveBeenCalledWith('https://opencode.ai/docs');

    await fireEvent.press(screen.getByTestId('open-issue'));
    expect(mockOpenURL).toHaveBeenCalledWith('https://github.com/sst/opencode/issues');
  });

  it('goes back when the back button is pressed', async () => {
    await renderSettings().render;
    await fireEvent.press(screen.getByTestId('settings-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
