export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  executionTime: number; // in seconds
  className?: string;
  failureMessage?: string;
}

export interface TestReport {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  totalTime: number; // in seconds
  testCases: TestCase[];
}

export interface OidcValidatorState {
  error: string | null;
  htmlFileUrl: string;
  xmlFileUrl: string;
  runValidatorLoading: boolean;
  publishOidcSettingLoading: boolean;
  testReport: TestReport | null;
}
