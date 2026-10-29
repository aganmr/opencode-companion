import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { theme } from './src/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { migrateLegacyState, persistor, store } from './src/store/store';

export default function App() {
  // One-time import of the pre-Redux AsyncStorage keys. PersistGate delays
  // the first render until rehydration finished, so by the time this runs
  // the persisted state is in place and the import is persisted in turn.
  useEffect(() => {
    void migrateLegacyState();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <NavigationContainer
              theme={{
                ...DarkTheme,
                colors: {
                  ...DarkTheme.colors,
                  background: theme.colors.background,
                  card: theme.colors.surface,
                },
              }}
            >
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
