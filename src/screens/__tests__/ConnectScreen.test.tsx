import React from 'react';
import { BackHandler, Keyboard, Platform, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import { ConnectScreen } from '../ConnectScreen';
import { theme } from '../../theme';
import { imeFixScript } from '../../lib/webview/imeFix';
import { historyProbeScript, requestHistoryProbe } from '../../lib/webview/historyProbe';
import { makeStore } from '../../store/rootReducer';

// Keyboard: capture the listeners the screen registers (IME inset fallback).
type KbShow = { endCoordinates: { height: number } };
const mockKeyboardListeners: Record<string, (e?: KbShow) => void> = {};
jest.spyOn(Keyboard, 'addListener').mockImplementation(
  (event: string, cb: any) => {
    mockKeyboardListeners[event] = cb as (e?: KbShow) => void;
    return { remove: jest.fn() };
  }
);

// The screen gates the IME inset on Android API < 30 — pin the platform for
// this suite (jest-expo defaults to iOS).
beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  Object.defineProperty(Platform, 'Version', { configurable: true, value: '10' });
});

// WebView: record the props we care about and render a plain View that
// forwards the load/error callbacks so tests can fire them. The ref exposes
// spied goBack/injectJavaScript (hardware-back tests); the page's history
// probe answer is fed through the onMessage prop.
const mockWebViewProps: Record<string, unknown> = {};
const mockWebGoBack = jest.fn();
const mockWebInjectJs = jest.fn();
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebViewMock = React.forwardRef(
    (props: Record<string, unknown>, ref: any) => {
      Object.assign(mockWebViewProps, props);
      React.useImperativeHandle(ref, () => ({
        goBack: mockWebGoBack,
        injectJavaScript: mockWebInjectJs,
      }));
      return React.createElement(View, {
        testID: 'webview-mock',
        onLoad: props.onLoad,
        onLoadStart: props.onLoadStart,
        onHttpError: props.onHttpError,
        onError: props.onError,
        onMessage: props.onMessage,
      });
    }
  );
  WebViewMock.displayName = 'WebViewMock';
  return { WebView: WebViewMock, __esModule: true };
});

/** Simulate the page answering the history probe. */
function probeAnswer(canGoBack: boolean) {
  const onMessage = mockWebViewProps.onMessage as (e: {
    nativeEvent: { data: string };
  }) => void;
  onMessage({ nativeEvent: { data: JSON.stringify({ canGoBack }) } });
}

// BackHandler: capture the hardwareBackPress listener the screen registers.
let mockBackListener: (() => boolean) | null = null;
jest.spyOn(BackHandler, 'addEventListener').mockImplementation(
  (event: string, cb: any) => {
    if (event === 'hardwareBackPress') {
      mockBackListener = cb as () => boolean;
    }
    return { remove: jest.fn() };
  }
);

// NetInfo: controllable, so tests can flip connectivity. (The `mock` prefix
// is required for jest.mock hoisting; overrides jest-setup's static mock.)
const mockUseNetInfo = jest.fn(() => ({ isConnected: true, type: 'wifi' }));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  useNetInfo: () => mockUseNetInfo(),
}));

const URL = 'http://192.168.0.131:8090/';

const mockGoBack = jest.fn();

/** A plain (non-persisted) store; settings can be seeded per test. */
function screenEl(settings?: { autoHidePill?: boolean; webviewZoom?: boolean }) {
  const store = makeStore(
    settings ? { settings: { autoHidePill: true, webviewZoom: true, ...settings } } : undefined
  );
  return (
    <Provider store={store}>
      <PaperProvider theme={theme}>
        <ConnectScreen
          route={{ params: { url: URL } } as never}
          navigation={{ goBack: mockGoBack } as never}
        />
      </PaperProvider>
    </Provider>
  );
}

// RNTL 14: fireEvent is async — must be awaited before asserting.
async function markLoaded() {
  await fireEvent(screen.getByTestId('webview-mock'), 'load');
}

describe('ConnectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetInfo.mockReturnValue({ isConnected: true, type: 'wifi' });
    mockBackListener = null;
    for (const k of Object.keys(mockKeyboardListeners)) {
      delete mockKeyboardListeners[k];
    }
  });

  it('injects the IME fix script and the history probe into the WebView', async () => {
    await render(screenEl());
    const injected = mockWebViewProps.injectedJavaScript as string;
    expect(injected).toContain(imeFixScript);
    expect(injected).toContain(historyProbeScript);
  });

  it('shows the Connecting pill while loading and Connected after load', async () => {
    await render(screenEl());
    expect(screen.getByText('Connecting…')).toBeTruthy();

    await markLoaded();
    expect(screen.getByText('Connected')).toBeTruthy();
  });

  it('shows a dark loading overlay with the host while loading, removed after load', async () => {
    await render(screenEl());
    expect(screen.getByTestId('connect-loading')).toBeTruthy();
    expect(screen.getByText('192.168.0.131:8090')).toBeTruthy();

    await markLoaded();
    expect(screen.queryByTestId('connect-loading')).toBeNull();
  });

  it('shows the Disconnect dialog and returns home on confirm', async () => {
    await render(screenEl());
    expect(screen.queryByText('Disconnect?')).toBeNull();

    await fireEvent.press(screen.getByTestId('connect-close'));
    expect(screen.getByText('Disconnect?')).toBeTruthy();
    expect(screen.getByText(/stays in your recent list/i)).toBeTruthy();

    // Cancel dismisses without navigating. (The paper Dialog keeps its
    // content mounted during the exit animation, so assert behavior, not
    // DOM disappearance.)
    await fireEvent.press(screen.getByTestId('disconnect-cancel'));
    expect(mockGoBack).not.toHaveBeenCalled();

    // Confirm navigates home.
    await fireEvent.press(screen.getByTestId('connect-close'));
    await fireEvent.press(screen.getByTestId('disconnect-confirm'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('consumes Android back to walk the WebView history when the web has history', async () => {
    await render(screenEl());
    await markLoaded();
    // The page answers the probe injected on load.
    probeAnswer(true);
    await act(async () => {});

    expect(mockBackListener).toBeTruthy();
    expect(mockBackListener!()).toBe(true);
    expect(mockWebGoBack).toHaveBeenCalledTimes(1);
    // A fresh probe is requested after the traversal.
    expect(mockWebInjectJs).toHaveBeenCalledWith(requestHistoryProbe);
  });

  it('lets Android back pop the screen when the web has no history', async () => {
    await render(screenEl());
    await markLoaded();
    probeAnswer(false);
    await act(async () => {});

    expect(mockBackListener!()).toBe(false);
    expect(mockWebGoBack).not.toHaveBeenCalled();
  });

  it('lets Android back pop the screen while the page is still loading', async () => {
    await render(screenEl());
    // No onLoad fired yet — the listener must not consume the back press.
    expect(mockBackListener!()).toBe(false);
    expect(mockWebGoBack).not.toHaveBeenCalled();
  });

  it('keeps the Connected pill for the whole session when auto-hide is disabled', async () => {
    jest.useFakeTimers();
    try {
      const { unmount } = await render(screenEl({ autoHidePill: false }));
      await markLoaded();
      expect(screen.getByText('Connected')).toBeTruthy();

      // Well past the 1-minute auto-hide timeout.
      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });
      expect(screen.getByTestId('connect-status')).toBeTruthy();

      unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('passes the zoom setting to the WebView (default on, off when disabled)', async () => {
    await render(screenEl());
    expect(mockWebViewProps.zoomEnabled).toBe(true);

    await render(screenEl({ webviewZoom: false }));
    expect(mockWebViewProps.zoomEnabled).toBe(false);
  });

  it('hides the Connected pill 1 minute after connecting, and re-shows it on reconnect', async () => {
    jest.useFakeTimers();
    try {
      const { rerender } = await render(screenEl());

      await markLoaded();
      // Connected pill is visible.
      expect(screen.getByText('Connected')).toBeTruthy();

      // Still visible just before the timeout.
      // RNTL 14: act is async — await so timer-driven updates commit.
      await act(async () => {
        jest.advanceTimersByTime(59_000);
      });
      expect(screen.getByTestId('connect-status')).toBeTruthy();

      // Gone at the 1-minute mark.
      await act(async () => {
        jest.advanceTimersByTime(1_000);
      });
      expect(screen.queryByTestId('connect-status')).toBeNull();

      // Going offline brings the pill back (offline state).
      // RNTL 14: rerender is async — await before asserting.
      mockUseNetInfo.mockReturnValue({ isConnected: false, type: 'none' });
      await rerender(screenEl());
      expect(screen.getByText('Offline — reconnecting')).toBeTruthy();

      // Reconnecting shows the Connected pill again with a fresh 1-minute clock.
      mockUseNetInfo.mockReturnValue({ isConnected: true, type: 'wifi' });
      await rerender(screenEl());
      expect(screen.getByText('Connected')).toBeTruthy();
      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });
      expect(screen.queryByTestId('connect-status')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shrinks the WebView for the keyboard on Android 10 (IME inset fallback)', async () => {
    await render(screenEl());
    expect(mockKeyboardListeners.keyboardDidShow).toBeTruthy();
    expect(mockKeyboardListeners.keyboardDidHide).toBeTruthy();

    const paddingBottom = () =>
      StyleSheet.flatten(screen.getByTestId('webview-wrap').props.style).paddingBottom;
    expect(paddingBottom()).toBe(0);

    await act(async () => {
      mockKeyboardListeners.keyboardDidShow({ endCoordinates: { height: 300 } });
    });
    expect(paddingBottom()).toBe(300);

    await act(async () => {
      mockKeyboardListeners.keyboardDidHide();
    });
    expect(paddingBottom()).toBe(0);
  });

  it('renders the close FAB 18% smaller than the default medium size (46dp square)', async () => {
    await render(screenEl());
    // customSize lands on the inner content view (paper applies the FAB
    // dimensions there, not on the outer surface).
    const s = StyleSheet.flatten(
      screen.getByTestId('connect-close-content').props.style
    ) as { width?: number; height?: number };
    expect(s.width).toBe(46);
    expect(s.height).toBe(46);
  });

  it('does not register keyboard listeners on Android 11+ (WebView handles IME)', async () => {
    Object.defineProperty(Platform, 'Version', { configurable: true, value: '35' });
    try {
      await render(screenEl());
      expect(mockKeyboardListeners.keyboardDidShow).toBeUndefined();
      expect(mockKeyboardListeners.keyboardDidHide).toBeUndefined();
    } finally {
      Object.defineProperty(Platform, 'Version', { configurable: true, value: '10' });
    }
  });
});
