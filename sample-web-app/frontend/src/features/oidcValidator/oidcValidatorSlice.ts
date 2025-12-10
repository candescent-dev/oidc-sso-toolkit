import JSZip from 'jszip';
import { AxiosError } from 'axios';
import { getApi } from '../../services/api';
import { OidcValidatorState } from './types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: OidcValidatorState = {
  error: null,
  htmlFileUrl: '',
  xmlFileUrl: '',
  runValidatorLoading: false,
  publishOidcSettingLoading: false,
};

// -------------------- Async Thunk --------------------
export const fetchE2EReports = createAsyncThunk<
  { htmlFileUrl: string; xmlFileUrl: string },
  void,
  { rejectValue: { error: string } }
>('oidcValidator/fetchE2EReports', async (_, { rejectWithValue }) => {
  try {
    const api = getApi();
    const response = await api.post('e2e-test', null, {
      responseType: 'arraybuffer',
    });
    const zipData = response.data;
    const zip = await JSZip.loadAsync(zipData);
    const htmlContent = (await zip.file('e2e-report.html')?.async('string')) || '';
    const xmlContent = (await zip.file('jest-e2e.xml')?.async('string')) || '';
    const htmlFileUrl = URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' }));
    const xmlFileUrl = URL.createObjectURL(new Blob([xmlContent], { type: 'text/xml' }));
    return { htmlFileUrl, xmlFileUrl };
  } catch (err: unknown) {
    let message = 'Server Error: Something went wrong. Please try again later';
    if (err instanceof AxiosError) {
      const data = err.response?.data;
      // Case: responseType: 'arraybuffer' → errors come back as ArrayBuffer
      if (data instanceof ArrayBuffer) {
        try {
          const decodedJson = JSON.parse(new TextDecoder().decode(data));
          if (decodedJson?.message) {
            message = decodedJson.message;
          }
        } catch {
          // If decoding fails, keep default message
        }
      } else if (data?.message) {
        // Case: Axios parsed JSON normally
        message = data.message;
      } else if (err.message) {
        // Fallback to Axios error message
        message = err.message;
      }
    } else if (err instanceof Error) {
      message = err.message;
    }
    return rejectWithValue({ error: message });
  }
});

// -------------------- Slice --------------------
const oidcValidatorSlice = createSlice({
  name: 'oidcValidator',
  initialState,
  reducers: {
    /** Set loading state */
    setPublishOidcSettingLoading: (state, action: PayloadAction<boolean>) => {
      state.publishOidcSettingLoading = action.payload;
    },
    /** Reset the oidcValidator state to initial values */
    resetOidcValidatorState(state) {
      if (state.htmlFileUrl) URL.revokeObjectURL(state.htmlFileUrl);
      if (state.xmlFileUrl) URL.revokeObjectURL(state.xmlFileUrl);
      state.error = null;
      state.htmlFileUrl = '';
      state.xmlFileUrl = '';
      state.runValidatorLoading = false;
      state.publishOidcSettingLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchE2EReports.pending, (state) => {
      state.error = null;
      state.runValidatorLoading = true;
      if (state.htmlFileUrl) URL.revokeObjectURL(state.htmlFileUrl);
      if (state.xmlFileUrl) URL.revokeObjectURL(state.xmlFileUrl);
      state.htmlFileUrl = '';
      state.xmlFileUrl = '';
    });
    builder.addCase(fetchE2EReports.fulfilled, (state, action) => {
      state.runValidatorLoading = false;
      state.htmlFileUrl = action.payload.htmlFileUrl;
      state.xmlFileUrl = action.payload.xmlFileUrl;
    });
    builder.addCase(fetchE2EReports.rejected, (state, action) => {
      state.runValidatorLoading = false;
      state.error = action.payload?.error || 'Something went wrong. Please try again later';
    });
  },
});

export const { setPublishOidcSettingLoading, resetOidcValidatorState } = oidcValidatorSlice.actions;
export default oidcValidatorSlice.reducer;
