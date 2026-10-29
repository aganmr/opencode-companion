import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Dialog, IconButton, Portal, Snackbar } from 'react-native-paper';
import Clipboard from '@react-native-clipboard/clipboard';
import { SessionCard } from '../components/SessionCard';
import { ServerCard } from '../components/ServerCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { removeSession } from '../store/sessionsSlice';
import {
  deleteServer,
  serverDisplayName,
  serverUrl,
  type Server,
} from '../store/serversSlice';
import { relativeTime } from '../lib/time';
import {
  sessionExpiryFor,
  sessionExpiryLabel,
  type ExpiryState,
} from '../lib/sessionExpiry';
import { serverSavedCleared } from '../store/uiSlice';
import { oc } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

/** Colors for the session-card expiry label, by state. */
const EXPIRY_COLORS: Record<ExpiryState, string> = {
  ok: oc.onSurfaceVariant,
  soon: oc.warning,
  expired: oc.error,
};

/**
 * A "Server saved" flag older than this is ignored when Home regains focus
 * (e.g. app relaunched long after the save).
 */
const SAVE_SNACKBAR_FRESHNESS_MS = 10_000;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  // Store-backed lists: updates (scanner, add/edit server, deletes) land in
  // the UI in realtime, no focus re-fetch needed.
  const sessions = useAppSelector((s) => s.sessions);
  const servers = useAppSelector((s) => s.servers);
  const lastServerSavedAt = useAppSelector((s) => s.ui.lastServerSavedAt);
  // Set while the "Server saved" snackbar is up on the landing page.
  const [serverSavedVisible, setServerSavedVisible] = useState(false);

  // AddServer goes back immediately after saving, so its confirmation is
  // shown here: on regaining focus, a save from the last few seconds lights
  // up the snackbar and clears the (self-expiring) flag.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (Date.now() - lastServerSavedAt < SAVE_SNACKBAR_FRESHNESS_MS) {
        setServerSavedVisible(true);
        dispatch(serverSavedCleared());
      }
    });
    return unsubscribe;
  }, [navigation, dispatch, lastServerSavedAt]);
  // Which card (by url) is in "active mode" — long-press shows its actions.
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  // Which session the confirmation dialog is targeting.
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  // Set while the "URL copied" snackbar is up.
  const [copied, setCopied] = useState(false);
  // Which server card is in "edit mode" — long-press shows Edit + Delete.
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  // Which server the delete confirmation dialog is targeting.
  const [confirmServerId, setConfirmServerId] = useState<string | null>(null);

  const handlePress = (url: string) => {
    if (activeUrl === url) {
      // Tapping the card body while active exits active mode.
      setActiveUrl(null);
      return;
    }
    navigation.navigate('Connect', { url });
  };

  const handleLongPress = (url: string) => {
    setActiveUrl((cur) => (cur === url ? null : url));
  };

  const handleCopy = (url: string) => {
    Clipboard.setString(url);
    setActiveUrl(null);
    setCopied(true);
  };

  const handleConfirmDelete = () => {
    if (confirmUrl === null) {
      return;
    }
    dispatch(removeSession(confirmUrl));
    setConfirmUrl(null);
    setActiveUrl(null);
  };

  const handleServerPress = (s: Server) => {
    if (editingServerId === s.id) {
      // Tapping the card body while in edit mode exits edit mode.
      setEditingServerId(null);
      return;
    }
    navigation.navigate('Connect', { url: serverUrl(s) });
  };

  const handleServerLongPress = (s: Server) => {
    setEditingServerId((cur) => (cur === s.id ? null : s.id));
  };

  const handleServerEdit = (s: Server) => {
    navigation.navigate('AddServer', { server: s });
  };

  const handleConfirmServerDelete = () => {
    if (confirmServerId === null) {
      return;
    }
    dispatch(deleteServer(confirmServerId));
    setConfirmServerId(null);
    setEditingServerId(null);
  };

  return (
    <View style={styles.root}>
      {/* Fixed header: stays put while the lists scroll. */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={styles.title}>opencode</Text>
          <Text style={styles.subtitle}>companion</Text>
        </View>
        <IconButton
          icon="cog"
          iconColor={oc.onSurfaceVariant}
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
          testID="settings-button"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>RECENT SESSIONS</Text>

        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No recent sessions yet.</Text>
            <Text style={styles.emptyHint}>Scan a QR code to connect.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sessions.map((s) => {
              const expiry = sessionExpiryFor(s.connectedAt);
              return (
                <SessionCard
                  key={s.url}
                  url={s.url}
                  time={relativeTime(s.connectedAt)}
                  expiryLabel={sessionExpiryLabel(expiry)}
                  expiryColor={EXPIRY_COLORS[expiry.state]}
                  onPress={() => handlePress(s.url)}
                  onLongPress={() => handleLongPress(s.url)}
                  onCopy={() => handleCopy(s.url)}
                  onDelete={() => setConfirmUrl(s.url)}
                  isDeleting={activeUrl === s.url}
                />
              );
            })}
          </View>
        )}

        <Text style={styles.sectionLabel}>SAVED SERVERS</Text>

        {servers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No saved servers yet.</Text>
            <Text style={styles.emptyHint}>Use “Enter Manual URL” to add one.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {servers.map((s) => (
              <ServerCard
                key={s.id}
                name={serverDisplayName(s)}
                url={serverUrl(s)}
                onPress={() => handleServerPress(s)}
                onLongPress={() => handleServerLongPress(s)}
                onEdit={() => handleServerEdit(s)}
                onDelete={() => setConfirmServerId(s.id)}
                isEditing={editingServerId === s.id}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        <Button
          mode="text"
          icon="link-variant"
          style={styles.enterUrlButton}
          testID="enter-manual-url"
          onPress={() => navigation.navigate('AddServer', {})}
        >
          Enter Manual URL
        </Button>
        <Text style={styles.footerOr}>or</Text>
        <Button
          mode="contained"
          icon="qrcode"
          style={styles.scanButton}
          contentStyle={styles.scanButtonContent}
          labelStyle={styles.scanButtonLabel}
          testID="scan-button"
          onPress={() => navigation.navigate('Scanner')}
        >
          Scan QR Code
        </Button>
      </View>

      <Portal>
        <Dialog visible={confirmUrl !== null} onDismiss={() => setConfirmUrl(null)}>
          <Dialog.Title>Delete session?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText} numberOfLines={2}>
              Remove “{confirmUrl}” from recent sessions?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmUrl(null)}>Cancel</Button>
            <Button onPress={handleConfirmDelete} textColor={oc.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={confirmServerId !== null} onDismiss={() => setConfirmServerId(null)}>
          <Dialog.Title>Delete server?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>Remove this saved server?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmServerId(null)}>Cancel</Button>
            <Button onPress={handleConfirmServerDelete} textColor={oc.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={copied}
        onDismiss={() => setCopied(false)}
        duration={2000}
        testID="copied-snackbar"
      >
        URL copied to clipboard
      </Snackbar>

      <Snackbar
        visible={serverSavedVisible}
        onDismiss={() => setServerSavedVisible(false)}
        duration={2000}
        testID="server-saved-snackbar"
      >
        Server saved
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  // IconButton defaults to a 48dp touch target; the negative offsets pull it
  // back onto the title line visually while keeping the full tap area.
  settingsButton: {
    marginRight: -10,
    marginTop: -6,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: oc.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 15,
    color: oc.onSurfaceVariant,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: oc.onSurfaceVariant,
    marginBottom: 12,
  },
  list: {
    gap: 12,
    marginBottom: 24,
  },
  empty: {
    paddingVertical: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: oc.onSurfaceVariant,
  },
  emptyHint: {
    marginTop: 4,
    fontSize: 13,
    color: oc.outline,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: oc.surfaceContainerLow,
    borderTopWidth: 1,
    borderTopColor: oc.outlineVariant,
  },
  scanButton: {
    borderRadius: 16,
  },
  scanButtonContent: {
    height: 46,
  },
  scanButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  enterUrlButton: {
    marginBottom: 2,
  },
  footerOr: {
    fontSize: 12,
    color: oc.outline,
    textAlign: 'center',
    marginBottom: 6,
  },
  dialogText: {
    fontSize: 14,
    lineHeight: 20,
    color: oc.onSurfaceVariant,
  },
});
