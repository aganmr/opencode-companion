import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * User settings. Defaults double as the first-render value (the slices are
 * plain values, so there is no "loading" state like the old AsyncStorage
 * load-then-set pattern).
 */
const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    /** The Connected pill auto-hides after 1 minute. */
    autoHidePill: true,
    /** Pinch-to-zoom in the WebView. */
    webviewZoom: true,
  },
  reducers: {
    setAutoHidePill(state, action: PayloadAction<boolean>) {
      state.autoHidePill = action.payload;
    },
    setWebviewZoom(state, action: PayloadAction<boolean>) {
      state.webviewZoom = action.payload;
    },
  },
});

export const { setAutoHidePill, setWebviewZoom } = settingsSlice.actions;
export default settingsSlice.reducer;
