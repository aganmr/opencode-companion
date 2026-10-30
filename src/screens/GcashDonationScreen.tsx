import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton, Snackbar } from 'react-native-paper';
import { saveImageToGallery } from 'gcash-image';
import { oc } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GcashDonation'>;

// The QR image already includes the "Transfer fees may apply." caption.
const QR_IMAGE = require('../../assets/gcash-qr.png');

export function GcashDonationScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const handleDownload = async () => {
    if (downloading) {
      return;
    }
    setDownloading(true);
    try {
      await saveImageToGallery();
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Fixed header: matches the Settings screen header. */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <IconButton
          icon="arrow-left"
          iconColor={oc.onSurfaceVariant}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          testID="gcash-back"
        />
        <Text style={styles.title}>GCash</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.qrCard}>
          <Image source={QR_IMAGE} style={styles.qrImage} testID="gcash-qr-image" />
        </View>
        <Text style={styles.hint}>Scan with the GCash app to complete your donation.</Text>
      </View>

      {/* Bottom footer band: same look as the scanner's permission footer. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Button
          mode="contained"
          icon="download"
          loading={downloading}
          style={styles.downloadButton}
          contentStyle={styles.downloadButtonContent}
          labelStyle={styles.downloadButtonLabel}
          onPress={handleDownload}
          testID="download-qr"
        >
          Download QR to phone
        </Button>
      </View>

      <Snackbar
        visible={saved}
        onDismiss={() => setSaved(false)}
        duration={2500}
        testID="qr-saved-snackbar"
      >
        QR saved to gallery
      </Snackbar>
      <Snackbar
        visible={saveError}
        onDismiss={() => setSaveError(false)}
        duration={2500}
        testID="qr-save-error-snackbar"
      >
        Could not save the QR image
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: oc.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: oc.onSurface,
    letterSpacing: -0.5,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  qrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
  },
  qrImage: {
    width: 264,
    height: 264,
  },
  // Same type scale as the scanner's permission text.
  hint: {
    marginTop: 22,
    fontSize: 14,
    lineHeight: 20,
    color: oc.onSurfaceVariant,
    textAlign: 'center',
  },
  // Mirrors the scanner's permission footer (ScannerScreen `permFooter`).
  footer: {
    backgroundColor: oc.surfaceContainerLow,
    borderTopWidth: 1,
    borderTopColor: oc.outlineVariant,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  downloadButton: {
    borderRadius: 16,
  },
  downloadButtonContent: {
    height: 46,
  },
  downloadButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
