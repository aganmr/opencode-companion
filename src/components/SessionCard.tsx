import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { oc } from '../theme';

type Props = {
  url: string;
  time: string;
  /** e.g. "expires in 29 days" / "expired — scan QR again". */
  expiryLabel: string;
  /** Color for the expiry label (neutral / warning / error). */
  expiryColor: string;
  onPress: () => void;
  onLongPress: () => void;
  onCopy: () => void;
  onDelete: () => void;
  isDeleting: boolean;
};

export function SessionCard({
  url,
  time,
  expiryLabel,
  expiryColor,
  onPress,
  onLongPress,
  onCopy,
  onDelete,
  isDeleting,
}: Props) {
  return (
    <TouchableRipple
      onPress={onPress}
      onLongPress={onLongPress}
      rippleColor="rgba(255, 255, 255, 0.08)"
      style={styles.ripple}
      accessibilityRole="button"
      accessibilityLabel={`Open session ${url}`}
      testID="session-card"
    >
      <View style={[styles.card, isDeleting && styles.cardActive]}>
        <View style={styles.body}>
          <Text style={styles.url} numberOfLines={1}>
            {url}
          </Text>
          <Text style={styles.time}>
            {time}
            <Text style={{ color: expiryColor }}> · {expiryLabel}</Text>
          </Text>
        </View>
        {isDeleting ? (
          <View style={styles.actions}>
            <TouchableRipple
              onPress={onCopy}
              rippleColor="rgba(255, 255, 255, 0.08)"
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={`Copy url of session ${url}`}
              testID="session-copy"
            >
              <View style={styles.actionLabel}>
                <MaterialCommunityIcons name="content-copy" size={15} color={oc.primary} />
                <Text style={styles.copyText}>Copy</Text>
              </View>
            </TouchableRipple>
            <TouchableRipple
              onPress={onDelete}
              rippleColor="rgba(255, 255, 255, 0.08)"
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={`Delete session ${url}`}
              testID="session-delete"
            >
              <View style={styles.actionLabel}>
                <MaterialCommunityIcons name="delete" size={15} color={oc.error} />
                <Text style={styles.deleteText}>Delete</Text>
              </View>
            </TouchableRipple>
          </View>
        ) : (
          <MaterialCommunityIcons name="chevron-right" size={22} color={oc.onSurfaceVariant} />
        )}
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  ripple: {
    borderRadius: 12,
  },
  card: {
    backgroundColor: oc.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: oc.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  // Long-pressed ("active") card: lighter background + border as a highlight.
  cardActive: {
    backgroundColor: oc.surfaceContainerHigh,
    borderColor: oc.outline,
  },
  body: {
    flex: 1,
    marginRight: 12,
  },
  url: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: oc.onSurface,
  },
  time: {
    marginTop: 4,
    fontSize: 12,
    color: oc.onSurfaceVariant,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  // TouchableRipple requires a single child element.
  actionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  copyText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: oc.primary,
  },
  deleteText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: oc.error,
  },
});
