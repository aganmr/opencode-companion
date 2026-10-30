import React, { useEffect, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { oc } from '../theme';

const KOPI_LOGO = require('../../assets/kofi-cup.png');
const GCASH_LOGO = require('../../assets/gcash-g.jpg');

type Props = {
  onKofi: () => void;
  onGcash: () => void;
};

/**
 * Slide-up bottom sheet offering the two donation options. The parent
 * mounts/unmounts it (it animates in on mount; dismissal is immediate).
 */
export function DonationSheet({ onKofi, onGcash }: Props) {
  // useState (not useRef().current) — the React 19 hooks lint rule forbids
  // reading ref values during render.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      stiffness: 180,
      damping: 22,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.backdrop, { opacity: progress }]}
        accessibilityLabel="Dismiss"
      />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} testID="donation-sheet">
        <View style={styles.handle} />
        <Text style={styles.title}>Support development</Text>
        <Text style={styles.sub}>Pick a way to send support.</Text>
        <OptionRow
          logo={KOPI_LOGO}
          logoStyle={styles.kofiLogo}
          name="Ko-fi"
          testID="donation-kofi"
          onPress={onKofi}
        />
        <OptionRow
          logo={GCASH_LOGO}
          name="GCash"
          testID="donation-gcash"
          onPress={onGcash}
        />
      </Animated.View>
    </View>
  );
}

function OptionRow({
  logo,
  logoStyle,
  name,
  testID,
  onPress,
}: {
  logo: number;
  logoStyle?: object;
  name: string;
  testID: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
      onPress={onPress}
      testID={testID}
    >
      <View style={[styles.logo, logoStyle]}>
        <Image source={logo} style={styles.logoImage} />
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: oc.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: oc.outline,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: oc.onSurface,
    marginBottom: 4,
  },
  sub: {
    fontSize: 12.5,
    color: oc.onSurfaceVariant,
    marginBottom: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: oc.surfaceVariant,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  optionPressed: {
    backgroundColor: oc.surfaceContainer,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
  },
  // The Ko-fi favicon sits on a white background — keep the chip white.
  kofiLogo: {
    backgroundColor: '#ffffff',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: oc.onSurface,
  },
  chevron: {
    fontSize: 18,
    color: oc.onSurfaceVariant,
  },
});
