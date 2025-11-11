import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SessionState, FormValuesPayload, OpenMode } from './types';

/* ------------------------- Initial State ------------------------- */
const initialState: SessionState = {
  clientId: '',
  clientSecret: '',
  loading: false,
  error: null,
  initUrl: '',
  callbackHost: '',
  openOption: '',
  iframeSettings: undefined,
};

/* ------------------------- Slice ------------------------- */
const sessionSlice = createSlice({
  name: 'session',
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
    setCredentials: (state, action: PayloadAction<{ clientId: string; clientSecret: string }>) => {
      state.clientId = action.payload.clientId;
      state.clientSecret = action.payload.clientSecret;
    },
    /** Set form values (including iframe settings if applicable) */
    setFormValues: (state, action: PayloadAction<FormValuesPayload>) => {
      const { initUrl, callbackHost, openOption, iframeSettings } = action.payload;
      state.initUrl = initUrl;
      state.callbackHost = callbackHost;
      state.openOption = openOption;
      // use enum for comparison
      if (openOption === OpenMode.IFRAME && iframeSettings) {
        state.iframeSettings = iframeSettings;
      } else {
        state.iframeSettings = undefined;
      }
    },
    /** Reset the session to initial values */
    resetSession: (state) => {
      state.clientId = '';
      state.clientSecret = '';
      state.loading = false;
      state.error = null;
      state.initUrl = '';
      state.callbackHost = '';
      state.openOption = '';
      state.iframeSettings = undefined;
    },
  },
});

/* ------------------------- Exports ------------------------- */
export const { setLoading, setError, setCredentials, setFormValues, resetSession } =
  sessionSlice.actions;

export default sessionSlice.reducer;
