import { createAction, createSlice } from '@reduxjs/toolkit';

/**
 * Ephemeral UI signals. The state is a plain number (persisting it is
 * harmless), and it self-expires: Home only reacts to a save that happened
 * within its freshness window, so a stale timestamp from a previous app
 * launch never shows a snackbar.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    /** When a server was last saved (add or edit), or 0. */
    lastServerSavedAt: 0,
  },
  reducers: {
    /** Home calls this after showing the "Server saved" snackbar. */
    serverSavedCleared() {
      return { lastServerSavedAt: 0 };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(serverSaved, (state, action) => {
      state.lastServerSavedAt = action.payload;
    });
  },
});

/** The timestamp is set by the caller, keeping the reducer pure. */
export const serverSaved = createAction<number>('ui/serverSaved');
export const { serverSavedCleared } = uiSlice.actions;
export default uiSlice.reducer;
