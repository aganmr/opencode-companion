import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, FAB, IconButton, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScanOverlay } from '../components/ScanOverlay';
import { parseOpencodeQr } from '../lib/qr';
import { useAppDispatch } from '../store/hooks';
import { addSession } from '../store/sessionsSlice';
import { oc } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

/** Ignore duplicate scans of the same QR for this many ms. */
const RESCAN_COOLDOWN_MS = 3_000;

export function ScannerScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [permission, requestPermission] = useCameraPermissions();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [scanning, setScanning] = useState(true);
  const lastScanRef = useRef(0);

  const handleBarcode = useCallback(
    (data: string) => {
      const now = Date.now();
      if (now - lastScanRef.current < RESCAN_COOLDOWN_MS) {
        return;
      }
      lastScanRef.current = now;

      const result = parseOpencodeQr(data);
      if (!result.ok) {
        setSnackbarVisible(true);
        return;
      }

      setScanning(false);
      // Store dispatch is synchronous — go straight to the Connect screen.
      dispatch(addSession({ url: result.url, connectedAt: Date.now() }));
      navigation.replace('Connect', { url: result.url });
    },
    [navigation, dispatch]
  );

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <FAB
          icon="close"
          customSize={46}
          style={styles.closeFab}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Close scanner"
          testID="scanner-close"
        />
        <View style={styles.permCenter}>
          <View style={styles.permIcon}>
            <MaterialCommunityIcons name="camera-off" size={44} color={oc.onSurfaceVariant} />
          </View>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionText}>
            The camera is used to scan opencode remote QR codes.
          </Text>
        </View>
        <View
          style={[
            styles.permFooter,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <Button
            mode="contained"
            icon="shield-check"
            style={styles.permissionButton}
            contentStyle={styles.permissionButtonContent}
            labelStyle={styles.permissionButtonLabel}
            testID="grant-permission"
            onPress={requestPermission}
          >
            Grant permission
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? (d) => handleBarcode(d.data) : undefined}
      />
      <ScanOverlay />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton
          icon="close"
          iconColor={oc.onSurface}
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Close scanner"
        />
        <Text style={styles.topTitle}>Scan</Text>
        <View style={styles.topSpacer} />
      </View>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
      >
        Not a valid opencode QR code
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: oc.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  closeButton: {
    backgroundColor: 'rgba(22, 24, 26, 0.6)',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: oc.onSurface,
  },
  topSpacer: {
    width: 48,
  },
  // Same placement/look as the Connect screen's close FAB.
  closeFab: {
    position: 'absolute',
    top: 12,
    right: 16,
    opacity: 0.55,
    zIndex: 1,
  },
  permCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  permIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: oc.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: oc.onSurface,
    textAlign: 'center',
  },
  permissionText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: oc.onSurfaceVariant,
    textAlign: 'center',
  },
  permFooter: {
    backgroundColor: oc.surfaceContainerLow,
    borderTopWidth: 1,
    borderTopColor: oc.outlineVariant,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  permissionButton: {
    borderRadius: 16,
  },
  permissionButtonContent: {
    height: 46,
  },
  permissionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
