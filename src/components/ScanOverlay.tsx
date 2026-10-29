import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { oc } from '../theme';

/** Scan frame + hint, drawn on top of the live camera preview. */
export function ScanOverlay() {
  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.frame} />
      <Text style={styles.hint}>Point your camera at the opencode remote QR code</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(228, 230, 233, 0.55)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  hint: {
    marginTop: 24,
    fontSize: 14,
    color: oc.onSurface,
    backgroundColor: 'rgba(15, 16, 18, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    textAlign: 'center',
  },
});
