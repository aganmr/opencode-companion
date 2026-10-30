import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { ConnectScreen } from '../screens/ConnectScreen';
import { AddServerScreen } from '../screens/AddServerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { GcashDonationScreen } from '../screens/GcashDonationScreen';
import { oc } from '../theme';
import type { Server } from '../store/serversSlice';

export type RootStackParamList = {
  Home: undefined;
  Scanner: undefined;
  Connect: { url: string };
  AddServer: { server?: Server };
  Settings: undefined;
  GcashDonation: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: oc.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="Connect" component={ConnectScreen} />
      <Stack.Screen name="AddServer" component={AddServerScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="GcashDonation" component={GcashDonationScreen} />
    </Stack.Navigator>
  );
}
