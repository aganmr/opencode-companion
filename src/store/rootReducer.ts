import { combineReducers, configureStore } from '@reduxjs/toolkit';
import settingsReducer from './settingsSlice';
import sessionsReducer from './sessionsSlice';
import serversReducer from './serversSlice';
import uiReducer from './uiSlice';

export const rootReducer = combineReducers({
  sessions: sessionsReducer,
  servers: serversReducer,
  settings: settingsReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Test/preview helper: a plain (non-persisted) store, optionally seeded.
 * Kept out of store.ts so importing it never triggers the persistor.
 */
export function makeStore(preloaded?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloaded as RootState,
  });
}
