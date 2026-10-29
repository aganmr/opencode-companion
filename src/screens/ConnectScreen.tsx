import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, Platform, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Banner, Button, Dialog, FAB, Portal, Text } from 'react-native-paper';
import { useNetInfo } from '@react-native-community/netinfo';
import { ErrorPanel } from '../components/ErrorPanel';
import { useAppSelector } from '../store/hooks';
import { imeFixScript } from '../lib/webview/imeFix';
import { historyProbeScript, requestHistoryProbe } from '../lib/webview/historyProbe';
import { oc } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

/** The "Connected" pill is transient: it hides after this much sustained
 *  connectivity. Any state change (e.g. going offline) re-shows it. */
const PILL_CONNECTED_TIMEOUT_MS = 60_000;

/**
 * On Android < 11 the WebView does not consume IME insets: the keyboard
 * simply overlaps the page and the focused input stays hidden (the page's
 * visual viewport does not even shrink — verified on Android 10). Newer
 * WebViews consume IME insets internally. On the older devices we shrink
 * the WebView from the bottom by the keyboard height (RN `Keyboard`
 * module, no custom native code) — the viewport resize makes the browser
 * scroll the focused input into view, the classic adjustResize behavior.
 */
function shouldUseImeInset(): boolean {
  // Platform.Version is typed string | number (numeric API level on Android).
  return Platform.OS === 'android' && parseInt(String(Platform.Version), 10) < 30;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Connect'>;

/**
 * v14's typings declare WebView as a plain FunctionComponent (no ref type),
 * but the runtime is a forwardRef exposing these native commands.
 */
type WebViewRef = {
  goBack(): void;
  goForward(): void;
  reload(): void;
  stopLoading(): void;
  injectJavaScript(script: string): void;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

/** Connection-axis states shown in the status pill. */
type ConnState = 'loading' | 'connected' | 'offline';

function statusMessage(code: number): string {
  if (code === 401 || code === 403) {
    return 'You are not signed in to this server — the 30-day session may have expired. Scan a fresh QR code from the opencode remote.';
  }
  if (code === 404 || code === 410) {
    return 'This pairing link has expired or was already used. Scan a fresh QR code from the opencode remote.';
  }
  if (code >= 500) {
    return 'The opencode server had a problem. Try again in a moment.';
  }
  return `The server responded with status ${code}. Try again.`;
}

const PILL: Record<ConnState, { dot: string; bg: string; text: string; label: string }> = {
  loading: {
    dot: oc.onSurfaceVariant,
    bg: 'rgba(30, 33, 36, 0.72)',
    text: oc.onBackground,
    label: 'Connecting…',
  },
  connected: {
    dot: oc.tertiary,
    bg: 'rgba(22, 41, 74, 0.72)',
    text: oc.onPrimaryContainer,
    label: 'Connected',
  },
  offline: {
    dot: oc.error,
    bg: 'rgba(46, 49, 54, 0.8)',
    text: oc.onBackground,
    label: 'Offline — reconnecting',
  },
};

/** Small semi-transparent pill, top-left, mirroring the close FAB on the right. */
function StatusPill({ state }: { state: ConnState }) {
  const cfg = PILL[state];
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]} testID="connect-status">
      <View style={[styles.pillDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.pillText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

export function ConnectScreen({ route, navigation }: Props) {
  const url = route.params.url;
  const insets = useSafeAreaInsets();
  // "host:port" form of the url for the loading indicator.
  const hostLabel = url.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  // True once the "Connected" pill has served its 1-minute purpose. Only ever
  // true while connected — any other state resets it (see effect below).
  const [pillHidden, setPillHidden] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  // Page-level signal from the remote (via the JS bridge). null = unknown,
  // so device connectivity is the primary axis until the page says otherwise.
  const [pageConnected, setPageConnected] = useState<boolean | null>(null);

  // Guards the load->ready transition: set by onHttpError/onError so a 4xx
  // response that still "loads" a document does not flip the state to ready.
  const erroredRef = useRef(false);
  // Settings (store-backed, realtime): when autoHidePill is false the
  // Connected pill stays for the whole session; webviewZoom toggles
  // pinch-to-zoom in the WebView.
  const autoHidePill = useAppSelector((s) => s.settings.autoHidePill);
  const webviewZoom = useAppSelector((s) => s.settings.webviewZoom);
  // Android hardware back: walk the web app's history first, and only leave
  // the session once the web history is exhausted (the listener then returns
  // false and React Navigation pops the screen). The web app's SPA history
  // (pushState) is invisible to native events, so the page reports its own
  // history depth via the injected probe (see historyProbe.ts) — the answer
  // arrives through onMessage below.
  const webRef = useRef<WebViewRef>(null);
  const webCanGoBackRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loadState.status === 'ready' && webCanGoBackRef.current) {
        webRef.current?.goBack();
        // Ask the page for its new history depth (cross-document traversals
        // also re-fire onLoad, which probes again).
        webRef.current?.injectJavaScript(requestHistoryProbe);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [loadState.status]);

  // Device connectivity (reacts to airplane mode / wifi/cellular loss).
  const netInfo = useNetInfo();
  const deviceOnline = netInfo.isConnected === true;
  const connected = deviceOnline && pageConnected !== false;

  // Auto-recovery: when the device regains connectivity (offline -> online)
  // and the page had loaded, remount the WebView so it re-fetches the session.
  const prevOnlineRef = useRef<boolean | null>(null);
  useEffect(() => {
    const prev = prevOnlineRef.current;
    prevOnlineRef.current = deviceOnline;
    if (prev === false && deviceOnline && loadState.status === 'ready') {
      setReloadKey((k) => k + 1);
    }
  }, [deviceOnline, loadState.status]);

  const pillState: ConnState =
    loadState.status === 'loading' ? 'loading' : connected ? 'connected' : 'offline';

  const showBanner = loadState.status === 'ready' && !connected;

  // The Connected pill is transient: once we're connected it hides after
  // PILL_CONNECTED_TIMEOUT_MS. Any transition out of "connected" re-shows it
  // immediately (and cancels the pending hide). With the auto-hide setting
  // disabled the pill never hides.
  useEffect(() => {
    if (pillState !== 'connected' || !autoHidePill) {
      return;
    }
    const t = setTimeout(() => setPillHidden(true), PILL_CONNECTED_TIMEOUT_MS);
    return () => {
      clearTimeout(t);
      // Any transition out of "connected" re-shows the pill immediately.
      setPillHidden(false);
    };
  }, [pillState, autoHidePill]);

  // IME inset fallback for Android < 11 (see shouldUseImeInset): shrink the
  // WebView by the keyboard height so the focused input stays visible.
  const imeInset = shouldUseImeInset();
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    if (!imeInset) {
      return;
    }
    const showSub = Keyboard.addListener('keyboardDidShow', (e) =>
      setKbHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [imeInset]);

  const handleDisconnect = () => {
    setDialogVisible(false);
    navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Banner visible={showBanner} icon="wifi-off" testID="connect-banner">
        No connection — reconnecting automatically.
      </Banner>

      <View style={styles.content}>
        {loadState.status === 'error' ? (
          <ErrorPanel
            message={loadState.message}
            onRetry={() => {
              setLoadState({ status: 'loading' });
              setAttempt((a) => a + 1);
            }}
            onScanAgain={() => navigation.goBack()}
          />
        ) : (
          <View
            style={[styles.webviewWrap, { paddingBottom: imeInset ? kbHeight : 0 }]}
            testID="webview-wrap"
          >
          <WebView
            key={`${attempt}-${reloadKey}`}
            // v14 typings omit the ref; the runtime accepts it (see WebViewRef).
            ref={webRef as never}
            source={{ uri: url }}
            style={styles.webview}
            backgroundColor={oc.background}
            zoomEnabled={webviewZoom}
            // Keeps focused inputs above the on-screen keyboard on older
            // WebViews (e.g. Android 10) that don't consume IME insets, and
            // installs the history probe used by the hardware-back handler.
            injectedJavaScript={`${imeFixScript}\n${historyProbeScript}`}
            onMessage={(event) => {
              // Page-level signals over the postMessage bridge:
              // {"connected": bool} feeds the pill, {"canGoBack": bool} is the
              // history probe's answer.
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data && typeof data.connected === 'boolean') {
                  setPageConnected(data.connected);
                }
                if (data && typeof data.canGoBack === 'boolean') {
                  webCanGoBackRef.current = data.canGoBack;
                }
              } catch {
                // Ignore non-JSON / unknown page messages.
              }
            }}
            onLoadStart={() => {
              erroredRef.current = false;
            }}
            onLoad={() => {
              // Main document loaded. Only mark ready if this load produced no
              // HTTP/network error (onHttpError/onError set erroredRef first).
              if (!erroredRef.current) {
                setLoadState({ status: 'ready' });
              }
              // Each document gets a fresh probe (the previous page's
              // __ocHistoryProbe is gone after a cross-document navigation).
              webRef.current?.injectJavaScript(requestHistoryProbe);
            }}
            onHttpError={(e) => {
              erroredRef.current = true;
              setLoadState({ status: 'error', message: statusMessage(e.nativeEvent.statusCode) });
            }}
            onError={(e) => {
              erroredRef.current = true;
              setLoadState({
                status: 'error',
                message:
                  e.nativeEvent.description ||
                  'Could not reach the opencode server. Check your connection and try again.',
              });
            }}
          />
          {/* Dark loading overlay: covers the WebView (and its white
              first-paint flash) until the main document has loaded. */}
          {loadState.status === 'loading' && (
            <View style={styles.loadingOverlay} testID="connect-loading">
              <ActivityIndicator size="large" color={oc.primary} />
              <Text style={styles.loadingText}>
                Connecting to <Text style={styles.loadingHost}>{hostLabel}</Text>
              </Text>
            </View>
          )}
          </View>
        )}

        {loadState.status !== 'error' && !pillHidden && <StatusPill state={pillState} />}

        {loadState.status !== 'error' && (
          <FAB
            icon="close"
            // 18% smaller than the default 56dp medium FAB.
            customSize={46}
            style={styles.closeFab}
            onPress={() => setDialogVisible(true)}
            accessibilityLabel="Disconnect"
            testID="connect-close"
          />
        )}
      </View>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Disconnect?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              This returns you to the home screen. The session stays in your
              recent list.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDialogVisible(false)}
              testID="disconnect-cancel"
            >
              Cancel
            </Button>
            <Button
              onPress={handleDisconnect}
              textColor={oc.error}
              testID="disconnect-confirm"
            >
              Disconnect
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: oc.background,
  },
  content: {
    flex: 1,
  },
  webviewWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: oc.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  loadingText: {
    fontSize: 14,
    color: oc.onSurfaceVariant,
  },
  loadingHost: {
    color: oc.onSurface,
    fontWeight: '600',
  },
  closeFab: {
    position: 'absolute',
    top: 12,
    right: 16,
    opacity: 0.55,
  },
  pill: {
    position: 'absolute',
    top: 12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: oc.outlineVariant,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dialogText: {
    fontSize: 14,
    lineHeight: 20,
    color: oc.onSurfaceVariant,
  },
});
