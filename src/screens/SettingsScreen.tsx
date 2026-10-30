import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Dialog, IconButton, Portal, Snackbar, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import pkg from '../../package.json';
import { DonationSheet } from '../components/DonationSheet';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearSessions } from '../store/sessionsSlice';
import { clearServers } from '../store/serversSlice';
import { setAutoHidePill, setWebviewZoom } from '../store/settingsSlice';
import { oc } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const DOCS_URL = 'https://opencode.ai/docs';
const ISSUE_URL = 'https://github.com/aganmr/opencode-companion/issues';

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const autoHidePill = useAppSelector((s) => s.settings.autoHidePill);
  const webviewZoom = useAppSelector((s) => s.settings.webviewZoom);
  const [confirm, setConfirm] = useState<'sessions' | 'servers' | null>(null);
  // Slide-up donation sheet (Ko-fi / GCash).
  const [donationVisible, setDonationVisible] = useState(false);
  const [coffeeSnackVisible, setCoffeeSnackVisible] = useState(false);

  const handleConfirmClear = () => {
    if (confirm === 'sessions') {
      dispatch(clearSessions());
    } else if (confirm === 'servers') {
      dispatch(clearServers());
    }
    setConfirm(null);
  };

  return (
    <View style={styles.root}>
      {/* Fixed header: stays put while the sections scroll. */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <IconButton
          icon="arrow-left"
          iconColor={oc.onSurfaceVariant}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          testID="settings-back"
        />
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section label="ABOUT">
          <Card>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>{pkg.version}</Text>
            </View>
            <View style={styles.noteRow}>
              <Text style={styles.note}>
                An unofficial companion app for opencode. Not affiliated with or endorsed by
                opencode.
              </Text>
            </View>
          </Card>
        </Section>

        <Section label="PREFERENCES">
          <Card>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Auto-hide Connected pill</Text>
                <Text style={styles.rowSub}>Dismiss after 1 minute</Text>
              </View>
              <Switch
                value={autoHidePill}
                onValueChange={(v) => {
                  dispatch(setAutoHidePill(v));
                }}
                testID="auto-hide-pill-switch"
              />
            </View>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Zoom in WebView</Text>
                <Text style={styles.rowSub}>Allow pinch-to-zoom on connected pages</Text>
              </View>
              <Switch
                value={webviewZoom}
                onValueChange={(v) => {
                  dispatch(setWebviewZoom(v));
                }}
                testID="webview-zoom-switch"
              />
            </View>
          </Card>
        </Section>

        <Section label="DATA">
          <Card>
            <RowButton
              icon="delete"
              label="Clear scanned servers"
              onPress={() => setConfirm('sessions')}
              testID="clear-sessions"
            />
            <RowButton
              icon="delete"
              label="Remove all saved servers"
              onPress={() => setConfirm('servers')}
              testID="clear-servers"
              last
            />
          </Card>
        </Section>

        <Section label="LINKS">
          <Card>
            <RowButton
              icon="open-in-new"
              label="opencode documentation"
              onPress={() => Linking.openURL(DOCS_URL)}
              testID="open-docs"
            />
            <RowButton
              icon="bug"
              label="Report an issue"
              onPress={() => Linking.openURL(ISSUE_URL)}
              testID="open-issue"
              last
            />
          </Card>
        </Section>

        <Section label="DONATE">
          <Card>
            <RowButton
              icon="coffee"
              label="Buy me a coffee"
              sub="Enjoying the app? Support development with a coffee. 😉"
              onPress={() => setDonationVisible(true)}
              testID="buy-me-a-coffee"
              last
            />
          </Card>
        </Section>
      </ScrollView>

      <Portal>
        <Dialog visible={confirm !== null} onDismiss={() => setConfirm(null)}>
          <Dialog.Title>
            {confirm === 'sessions' ? 'Clear scanned servers?' : 'Remove all saved servers?'}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              {confirm === 'sessions'
                ? 'This removes every server from your scanned list.'
                : 'This removes every server you have saved.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirm(null)}>Cancel</Button>
            <Button onPress={handleConfirmClear} textColor={oc.error}>
              {confirm === 'sessions' ? 'Clear' : 'Remove'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {donationVisible && (
        <DonationSheet
          onKofi={() => {
            // Ko-fi support isn't live yet: dismiss and reuse the
            // "Coming soon" snackbar.
            setDonationVisible(false);
            setCoffeeSnackVisible(true);
          }}
          onGcash={() => {
            setDonationVisible(false);
            navigation.navigate('GcashDonation');
          }}
        />
      )}

      <Snackbar
        visible={coffeeSnackVisible}
        onDismiss={() => setCoffeeSnackVisible(false)}
        duration={2500}
        testID="coming-soon-snackbar"
      >
        Coming soon
      </Snackbar>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function RowButton({
  icon,
  label,
  sub,
  onPress,
  testID,
  last,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  onPress: () => void;
  testID: string;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      testID={testID}
    >
      <MaterialCommunityIcons name={icon} size={20} color={oc.onSurfaceVariant} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub !== undefined && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
    </Pressable>
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
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: oc.onSurfaceVariant,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: oc.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: oc.surfaceVariant,
  },
  rowPressed: {
    backgroundColor: oc.surfaceContainer,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14.5,
    color: oc.onSurface,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: oc.onSurfaceVariant,
  },
  rowValue: {
    fontSize: 13.5,
    color: oc.onSurfaceVariant,
  },
  noteRow: {
    borderTopWidth: 1,
    borderTopColor: oc.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  note: {
    fontSize: 12.5,
    lineHeight: 18,
    color: oc.onSurfaceVariant,
  },
  dialogText: {
    fontSize: 14,
    lineHeight: 20,
    color: oc.onSurfaceVariant,
  },
});
