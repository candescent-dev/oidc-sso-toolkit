import { AxiosError } from 'axios';
import { getApi } from '../../services/api';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { OidcSsoInitiatorState, AuthSettingPayload, AuthSettingResponse } from './types';

const initialState: OidcSsoInitiatorState = {
  loading: false,
  message: '',
  error: null,
};

// -------------------- Async Thunk --------------------
export const saveAuthSetting = createAsyncThunk<
  AuthSettingResponse,
  AuthSettingPayload,
  { rejectValue: { error: string } }
>('oidcSsoInitiator/saveAuthSetting', async (payload, { rejectWithValue }) => {
  try {
    const api = getApi();
    const response = await api.post<AuthSettingResponse>('/auth/auth-setting', payload);
    return response.data;
  } catch (err: unknown) {
    let message = 'Server Error: Something went wrong. Please try again later';
    if (err instanceof AxiosError) {
      const data = err.response?.data as { message?: string } | undefined;
      if (data?.message) {
        message = data.message;
      } else if (err.message) {
        message = err.message;
      }
    } else if (err instanceof Error) {
      message = err.message;
    }
    return rejectWithValue({ error: message });
  }
});

// -------------------- Slice --------------------
const OidcSsoInitiatorSlice = createSlice({
  name: 'OidcSsoInitiator',
  initialState,
  reducers: {
    /** Reset the oidcSsoInitiatorState state to initial values */
    resetOidcSsoInitiatorState(state) {
      state.error = null;
      state.message = '';
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(saveAuthSetting.pending, (state) => {
      state.error = null;
      state.loading = true;
    });
    builder.addCase(saveAuthSetting.fulfilled, (state, action) => {
      state.loading = false;
      state.message = action.payload.message;
    });
    builder.addCase(saveAuthSetting.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.error || 'Something went wrong. Please try again later';
    });
  },
});

export const { resetOidcSsoInitiatorState } = OidcSsoInitiatorSlice.actions;
export default OidcSsoInitiatorSlice.reducer;
