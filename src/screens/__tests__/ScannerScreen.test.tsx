import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import { ScannerScreen } from '../ScannerScreen';
import { theme } from '../../theme';
import { makeStore } from '../../store/rootReducer';

// Navigation spies (the `mock` prefix is required for jest.mock hoisting).
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, replace: mockNavigate }),
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

// Camera: controllable permission state; CameraView records its props so
// tests can fire onBarcodeScanned.
const mockRequestPermission = jest.fn().mockResolvedValue({ granted: true });
let mockPermission = { granted: false, canAskAgain: true };
const mockCameraProps: Record<string, unknown> = {};
jest.mock('expo-camera', () => ({
  CameraView: (props: Record<string, unknown>) => {
    Object.assign(mockCameraProps, props);
    return null;
  },
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
  __esModule: true,
}));

function renderScanner(store = makeStore()) {
  return {
    store,
    render: render(
      <Provider store={store}>
        <PaperProvider theme={theme}>
          <ScannerScreen />
        </PaperProvider>
      </Provider>
    ),
  };
}

describe('ScannerScreen camera permission UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission = { granted: false, canAskAgain: true };
  });

  it('renders the centered permission message and footer button', async () => {
    await renderScanner().render;
    expect(screen.getByText('Camera access needed')).toBeTruthy();
    expect(
      screen.getByText('The camera is used to scan opencode remote QR codes.')
    ).toBeTruthy();
    expect(screen.getByTestId('grant-permission')).toBeTruthy();
  });

  it('requests permission when the footer button is pressed', async () => {
    await renderScanner().render;
    await fireEvent.press(screen.getByTestId('grant-permission'));
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('goes back when the close button is pressed', async () => {
    await renderScanner().render;
    await fireEvent.press(screen.getByTestId('scanner-close'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('hides the permission UI once granted (scanner shows)', async () => {
    mockPermission = { granted: true, canAskAgain: true };
    await renderScanner().render;

    expect(screen.queryByText('Camera access needed')).toBeNull();
    expect(screen.queryByTestId('grant-permission')).toBeNull();
  });
});

describe('ScannerScreen scan handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission = { granted: true, canAskAgain: true };
    for (const k of Object.keys(mockCameraProps)) {
      delete mockCameraProps[k];
    }
  });

  it('adds a session to the store and opens the Connect screen on a valid QR', async () => {
    const { store, render: r } = renderScanner();
    await r;

    const onBarcodeScanned = mockCameraProps.onBarcodeScanned as
      | ((e: { data: string }) => void)
      | undefined;
    expect(onBarcodeScanned).toBeTruthy();

    await act(async () => {
      onBarcodeScanned!({
        data: JSON.stringify({ code: 'abc123', urls: ['https://host.tunnel.xyz'] }),
      });
    });

    // The stored session keeps the server *origin* — reconnects load the
    // root and rely on the 30-day session cookie. The pairing path itself is
    // one-time and is only used for this first navigation.
    const [session] = store.getState().sessions;
    expect(session.url).toBe('https://host.tunnel.xyz');
    expect(mockNavigate).toHaveBeenCalledWith('Connect', {
      url: 'https://host.tunnel.xyz/auth/connect/abc123',
    });
  });

  it('shows a snackbar and adds nothing for an invalid QR', async () => {
    const { store, render: r } = renderScanner();
    await r;

    const onBarcodeScanned = mockCameraProps.onBarcodeScanned as
      | ((e: { data: string }) => void)
      | undefined;

    await act(async () => {
      onBarcodeScanned!({ data: 'not-json' });
    });

    expect(screen.getByText('Not a valid opencode QR code')).toBeTruthy();
    expect(store.getState().sessions).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
