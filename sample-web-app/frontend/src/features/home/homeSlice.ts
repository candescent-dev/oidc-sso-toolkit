import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HomeState, HomeConfigPayload, OpenMode } from './types';

/* ------------------------- Initial State ------------------------- */
const initialState: HomeState = {
  clientId: '',
  clientSecret: '',
  loading: false,
  error: null,
  initUrl: '',
  callbackHost: '',
  openOption: '',
  iframeSettings: undefined,
  credentialsIssuedAt: Number(sessionStorage.getItem('credentialsIssuedAt')) || null,
};

/* ------------------------- Slice ------------------------- */
const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    /** Set loading state */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    /** Set error message */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    /** Set client credentials */
    setCredentials: (
      state,
      action: PayloadAction<{
        clientId: string;
        clientSecret: string;
        credentialsIssuedAt: number | null;
      }>
    ) => {
      state.clientId = action.payload.clientId;
      state.clientSecret = action.payload.clientSecret;
      state.credentialsIssuedAt = action.payload.credentialsIssuedAt;
      // persist to sessionStorage
      sessionStorage.setItem('credentialsIssuedAt', String(action.payload.credentialsIssuedAt));
    },
    /** Set home configuration (including iframe settings if applicable) */
    setHomeConfigData: (state, action: PayloadAction<HomeConfigPayload>) => {
      const { initUrl, callbackHost, openOption, iframeSettings } = action.payload;
      state.initUrl = initUrl;
      state.callbackHost = callbackHost;
      state.openOption = openOption;
      // Use enum for comparison
      if (openOption === OpenMode.IFRAME && iframeSettings) {
        state.iframeSettings = iframeSettings;
      } else {
        state.iframeSettings = undefined;
      }
    },
    /** Reset the home state to initial values */
    resetHomeState: (state) => {
      state.clientId = '';
      state.clientSecret = '';
      state.loading = false;
      state.error = null;
      state.initUrl = '';
      state.callbackHost = '';
      state.openOption = '';
      state.iframeSettings = undefined;
      state.credentialsIssuedAt = null;
      // clear session storage
      sessionStorage.removeItem('credentialsIssuedAt');
    },
  },
});

/* ------------------------- Exports ------------------------- */
export const { setLoading, setError, setCredentials, setHomeConfigData, resetHomeState } =
  homeSlice.actions;

export default homeSlice.reducer;
