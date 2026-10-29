import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { oc } from '../theme';

type Props = {
  message: string;
  onRetry: () => void;
  onScanAgain: () => void;
};

/** Shown when the connect URL fails to load (expired link, network error, ...). */
export function ErrorPanel({ message, onRetry, onScanAgain }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="link-off" size={40} color={oc.error} />
        <Text style={styles.title}>Connection problem</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Button mode="contained" onPress={onRetry}>
            Retry
          </Button>
          <Button mode="contained-tonal" onPress={onScanAgain}>
            Scan again
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: oc.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: oc.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: oc.outlineVariant,
    alignItems: 'center',
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: oc.onSurface,
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: oc.onSurfaceVariant,
    textAlign: 'center',
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
  },
});
