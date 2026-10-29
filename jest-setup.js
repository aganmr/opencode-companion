// Global test setup: mocks for native modules that have no meaning under Jest.
// Note: jest.mock() factories are hoisted above any top-level declarations, so
// every factory must require its dependencies inline (no out-of-scope refs).

// AsyncStorage: use the package's built-in in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Clipboard: record writes, no native module under Jest.
jest.mock('@react-native-clipboard/clipboard', () => {
  const Clipboard = {
    setString: jest.fn(),
    getString: jest.fn().mockResolvedValue(''),
  };
  return { __esModule: true, default: Clipboard, ...Clipboard };
});

// NetInfo: report an online wifi connection by default in tests.
jest.mock('@react-native-community/netinfo', () => {
  const onlineState = { type: 'wifi', isConnected: true, isInternetReachable: true, details: {} };
  return {
    __esModule: true,
    useNetInfo: () => onlineState,
    fetch: jest.fn().mockResolvedValue(onlineState),
    refresh: jest.fn().mockResolvedValue(onlineState),
    addEventListener: jest.fn(() => jest.fn()),
    configure: jest.fn(),
  };
});

// Safe-area: fixed zero insets + the contexts that react-native-paper's
// SafeAreaProviderCompat reads (SafeAreaInsetsContext.Consumer).
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const frame = { x: 0, y: 0, width: 360, height: 640 };
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaProviderContext = React.createContext({ insets, frame });
  return {
    useSafeAreaInsets: () => insets,
    SafeAreaInsetsContext,
    SafeAreaProviderContext,
    initialWindowMetrics: { frame, insets },
    SafeAreaProvider: ({ children }) =>
      React.createElement(SafeAreaProviderContext.Provider, { value: { insets, frame } }, children),
    SafeAreaView: ({ children }) => children,
  };
});

// Expo vector icons: rendering the real component loads a font asset, which is
// unavailable under Jest. Replace icons with a plain Text carrying the icon name
// (and a stable testID) so tests can assert on them without native assets.
// Both the package root (named export) and the subpath react-native-paper uses
// (default export) must be mocked, or the real font-loading module loads.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, testID }) =>
    React.createElement(Text, { testID: testID || `icon-${name}` }, name);
  return { MaterialCommunityIcons: Icon, __esModule: true };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, testID }) =>
    React.createElement(Text, { testID: testID || `icon-${name}` }, name);
  return { default: Icon, __esModule: true };
});
