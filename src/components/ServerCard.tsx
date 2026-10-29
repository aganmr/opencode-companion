import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { oc } from '../theme';

type Props = {
  name: string;
  url: string;
  isEditing: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * A saved-server card. Long-press toggles "edit mode", which swaps the
 * chevron for Edit + Delete actions (same pattern as SessionCard's
 * single-delete mode).
 */
export function ServerCard({ name, url, isEditing, onPress, onLongPress, onEdit, onDelete }: Props) {
  return (
    <TouchableRipple
      onPress={onPress}
      onLongPress={onLongPress}
      rippleColor="rgba(255, 255, 255, 0.08)"
      style={styles.ripple}
      accessibilityRole="button"
      accessibilityLabel={`Open server ${name}`}
      testID="server-card"
    >
      <View style={[styles.card, isEditing && styles.cardEditing]}>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.url} numberOfLines={1}>
            {url}
          </Text>
        </View>
        {isEditing ? (
          <View style={styles.actions}>
            <TouchableRipple
              onPress={onEdit}
              rippleColor="rgba(255, 255, 255, 0.08)"
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={`Edit server ${name}`}
              testID="server-edit"
            >
              <View style={styles.actionLabel}>
                <MaterialCommunityIcons name="pencil" size={15} color={oc.primary} />
                <Text style={styles.editText}>Edit</Text>
              </View>
            </TouchableRipple>
            <TouchableRipple
              onPress={onDelete}
              rippleColor="rgba(255, 255, 255, 0.08)"
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={`Delete server ${name}`}
              testID="server-delete"
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
  // Long-pressed ("edit mode") card: lighter background + border as a
  // highlight (same treatment as SessionCard's active state).
  cardEditing: {
    backgroundColor: oc.surfaceContainerHigh,
    borderColor: oc.outline,
  },
  body: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: oc.onSurface,
  },
  url: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: oc.onSurfaceVariant,
    marginTop: 3,
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
  editText: {
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
