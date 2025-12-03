import JSZip from 'jszip';
import { AxiosError } from 'axios';
import { getApi } from '../../services/api';
import { E2EReportsState } from './types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: E2EReportsState = {
  loading: false,
  error: null,
  htmlFileUrl: '',
  xmlFileUrl: '',
};

// -------------------- Async Thunk --------------------
export const fetchE2EReports = createAsyncThunk<
  { htmlFileUrl: string; xmlFileUrl: string },
  void,
  { rejectValue: { errorReason: string } }
>('e2eReports/fetch', async (_, { rejectWithValue }) => {
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
    let message = 'Failed to download ZIP';
    if (err instanceof AxiosError) message = err.message;
    else if (err instanceof Error) message = err.message;
    return rejectWithValue({ errorReason: message });
  }
});

// -------------------- Slice --------------------
const e2eReportsSlice = createSlice({
  name: 'e2eReports',
  initialState,
  reducers: {
    /** Set loading state */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    /** Reset the oidcValidator state to initial values */
    resetE2EReportsState(state) {
      if (state.htmlFileUrl) URL.revokeObjectURL(state.htmlFileUrl);
      if (state.xmlFileUrl) URL.revokeObjectURL(state.xmlFileUrl);
      state.loading = false;
      state.error = null;
      state.htmlFileUrl = '';
      state.xmlFileUrl = '';
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchE2EReports.pending, (state) => {
      state.loading = true;
      state.error = null;
      if (state.htmlFileUrl) URL.revokeObjectURL(state.htmlFileUrl);
      if (state.xmlFileUrl) URL.revokeObjectURL(state.xmlFileUrl);
      state.htmlFileUrl = '';
      state.xmlFileUrl = '';
    });
    builder.addCase(fetchE2EReports.fulfilled, (state, action) => {
      state.loading = false;
      state.htmlFileUrl = action.payload.htmlFileUrl;
      state.xmlFileUrl = action.payload.xmlFileUrl;
    });
    builder.addCase(fetchE2EReports.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.errorReason || 'Something went wrong';
    });
  },
});

export const { setLoading, resetE2EReportsState } = e2eReportsSlice.actions;
export default e2eReportsSlice.reducer;
