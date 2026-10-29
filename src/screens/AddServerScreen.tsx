import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, SegmentedButtons, TextInput } from 'react-native-paper';
import { useAppDispatch } from '../store/hooks';
import {
  addServer,
  updateServer,
  type Server,
  type ServerInput,
} from '../store/serversSlice';
import { serverSaved } from '../store/uiSlice';
import { oc } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AddServer'>;

/** opencode's default server port. */
const DEFAULT_PORT = '4096';

/** Tolerate pasted full URLs: strip a leading scheme and trailing slashes. */
function normalizeHost(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

export function AddServerScreen({ route, navigation }: Props) {
  const editing: Server | undefined = route.params?.server;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const [name, setName] = useState(editing?.name ?? '');
  const [scheme, setScheme] = useState<'http' | 'https'>(editing?.scheme ?? 'http');
  const [host, setHost] = useState(editing?.host ?? '');
  const [port, setPort] = useState(editing ? String(editing.port) : DEFAULT_PORT);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const cleanHost = normalizeHost(host);
    if (cleanHost === '' || port.trim() === '') {
      setError('URL and Port are required.');
      return;
    }
    const p = Number(port);
    if (!Number.isInteger(p) || p < 1 || p > 65535) {
      setError('Port must be a whole number between 1 and 65535.');
      return;
    }
    const input: ServerInput = { name, scheme, host: cleanHost, port: p };
    if (editing) {
      dispatch(updateServer({ id: editing.id, input }));
    } else {
      dispatch(addServer(input));
    }
    // Flag the save so the landing page shows the "Server saved" snackbar —
    // this screen unmounts immediately, so the confirmation lives on Home.
    dispatch(serverSaved(Date.now()));
    navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Button
          icon="arrow-left"
          mode="text"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
          testID="addserver-back"
        >
          {''}
        </Button>
        <Text style={styles.title}>{editing ? 'Edit Server' : 'Add Server'}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>
          SERVER NAME <Text style={styles.labelOpt}>(optional)</Text>
        </Text>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          placeholder="e.g. Mark's PC"
          placeholderTextColor={oc.outline}
          mode="outlined"
          testID="addserver-name"
        />

        <Text style={styles.label}>SCHEME</Text>
        <SegmentedButtons
          value={scheme}
          onValueChange={(v) => setScheme(v as 'http' | 'https')}
          buttons={[
            { value: 'http', label: 'http' },
            { value: 'https', label: 'https' },
          ]}
        />

        <Text style={styles.label}>
          URL <Text style={styles.labelReq}>*</Text>
        </Text>
        <TextInput
          value={host}
          onChangeText={(t) => {
            setHost(t);
            setError(null);
          }}
          placeholder="192.168.0.131 or myserver.com"
          placeholderTextColor={oc.outline}
          mode="outlined"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          testID="addserver-host"
        />

        <Text style={styles.label}>
          PORT <Text style={styles.labelReq}>*</Text>
        </Text>
        <TextInput
          value={port}
          onChangeText={(t) => {
            setPort(t);
            setError(null);
          }}
          placeholder={DEFAULT_PORT}
          placeholderTextColor={oc.outline}
          mode="outlined"
          keyboardType="number-pad"
          testID="addserver-port"
        />
        <Text style={styles.hint}>Default: {DEFAULT_PORT} (opencode default port)</Text>

        {error ? (
          <Text style={styles.error} testID="addserver-error">
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.spacer} />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          mode="contained"
          contentStyle={styles.saveContent}
          labelStyle={styles.saveLabel}
          onPress={handleSave}
          testID="addserver-save"
        >
          {editing ? 'Save Changes' : 'Save Server'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: oc.background,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: oc.onSurface,
    marginLeft: 4,
  },
  form: {
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: oc.onSurfaceVariant,
    marginTop: 8,
  },
  labelOpt: {
    color: oc.outline,
    fontWeight: '400',
    letterSpacing: 0,
  },
  labelReq: {
    color: oc.primary,
  },
  hint: {
    fontSize: 12,
    color: oc.onSurfaceVariant,
    marginTop: 2,
  },
  error: {
    fontSize: 13.5,
    color: oc.error,
    marginTop: 12,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingTop: 12,
  },
  saveContent: {
    height: 46,
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
