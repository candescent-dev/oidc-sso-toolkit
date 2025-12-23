import JSZip from 'jszip';
import { AxiosError } from 'axios';
import { getApi } from '../../services/api';
import { OidcValidatorState, TestCase, TestReport } from './types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: OidcValidatorState = {
  error: null,
  htmlFileUrl: '',
  xmlFileUrl: '',
  runValidatorLoading: false,
  publishOidcSettingLoading: false,
  testReport: null,
};

/**
 * Parse XML content to extract test case information
 */
function parseTestReport(xmlContent: string): TestReport {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  const testCases: TestCase[] = [];
  let totalTime = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Find all testcase elements
  const testCaseElements = xmlDoc.querySelectorAll('testcase');
  
  testCaseElements.forEach((testCaseEl) => {
    const name = testCaseEl.getAttribute('name') || 'Unknown Test';
    const className = testCaseEl.getAttribute('classname') || '';
    const time = parseFloat(testCaseEl.getAttribute('time') || '0');
    totalTime += time;

    // Check for failure or skipped
    const failure = testCaseEl.querySelector('failure');
    const skippedEl = testCaseEl.querySelector('skipped');
    
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let failureMessage: string | undefined;

    if (skippedEl) {
      status = 'skipped';
      skipped++;
    } else if (failure) {
      status = 'failed';
      failed++;
      failureMessage = failure.textContent || undefined;
    } else {
      passed++;
    }

    testCases.push({
      name,
      status,
      executionTime: time,
      className,
      failureMessage,
    });
  });

  return {
    totalTests: testCases.length,
    passed,
    failed,
    skipped,
    totalTime,
    testCases,
  };
}

// -------------------- Async Thunk --------------------
export const fetchE2EReports = createAsyncThunk<
  { htmlFileUrl: string; xmlFileUrl: string; testReport: TestReport },
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
    
    // Parse test report from XML
    const testReport = parseTestReport(xmlContent);
    
    return { htmlFileUrl, xmlFileUrl, testReport };
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
      state.testReport = null;
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
      state.testReport = null;
    });
    builder.addCase(fetchE2EReports.fulfilled, (state, action) => {
      state.runValidatorLoading = false;
      state.htmlFileUrl = action.payload.htmlFileUrl;
      state.xmlFileUrl = action.payload.xmlFileUrl;
      state.testReport = action.payload.testReport;
    });
    builder.addCase(fetchE2EReports.rejected, (state, action) => {
      state.runValidatorLoading = false;
      state.error = action.payload?.error || 'Something went wrong. Please try again later';
    });
  },
});

export const { setPublishOidcSettingLoading, resetOidcValidatorState } = oidcValidatorSlice.actions;
export default oidcValidatorSlice.reducer;
