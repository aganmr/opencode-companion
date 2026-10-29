import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import { importLegacyState } from './legacyMigration';
import { rootReducer } from './rootReducer';

const persistConfig = {
  key: 'opencode-companion',
  version: 1,
  storage: AsyncStorage,
};

/**
 * The app's single store. redux-persist (AsyncStorage) writes every change,
 * so screens that select from it update in realtime and the state survives
 * app restarts.
 */
export const store = configureStore({
  reducer: persistReducer(persistConfig, rootReducer),
  // redux-persist's PERSIST/REHYDRATE actions carry function payloads, which
  // trip the default serializability check (a documented, expected warning
  // that clutters the dev log box). Disable the check; the app's own actions
  // all carry plain data.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;

/**
 * One-time migration from the pre-Redux AsyncStorage layout (the individual
 * `opencode.companion.*` keys). Must run AFTER rehydration so the imported
 * values are themselves persisted; the legacy keys are removed once read.
 */
export function migrateLegacyState(): Promise<void> {
  return importLegacyState(store);
}
