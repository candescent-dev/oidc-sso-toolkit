import * as os from 'os';
import { runCLI } from 'jest';
import archiver from 'archiver';
import { join, basename, dirname, resolve } from 'path';
import type { Cache } from 'cache-manager';
import { existsSync, mkdtempSync, rmSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from './types/e2eTest.types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuthSettingData } from '../auth/types/authSetting.types';

type JestReporter = string | [string, Record<string, any>];

@Injectable()
export class E2ETestService {
  private readonly AUTH_SETTING_CACHE_KEY = 'auth_setting';
  // Absolute path where compiled backend exists in packaged ZIP / Docker runtime
  private readonly PACKAGED_BACKEND_DIST_PATH = '/app/backend/dist';
  // Path to report assets (logo, custom CSS)
  private readonly REPORT_ASSETS_PATH = resolve(__dirname, '../../assets/reports');

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Retrieve cached auth setting, or undefined if expired.
   */
  async getAuthSettingFromCache(): Promise<AuthSettingData | undefined> {
    return await this.cacheManager.get<AuthSettingData>(this.AUTH_SETTING_CACHE_KEY);
  }
  /**
   * Determines whether the service is executing from a packaged (ZIP / Docker) backend runtime
   * @returns true if running from compiled backend output
   */
  private isPackagedBackendRuntime(): boolean {
    return existsSync(this.PACKAGED_BACKEND_DIST_PATH);
  }

  /**
   * Resolves the appropriate Jest root directory based on the current runtime layout
   * - Local / CI: project root (.)
   * - Packaged ZIP / Docker: compiled backend directory
   * @returns Jest rootDir value
   */
  private getJestRootDirectory(): string {
    return this.isPackagedBackendRuntime() ? this.PACKAGED_BACKEND_DIST_PATH : '.';
  }

  /**
   * Copies report assets (logo, CSS) to the temporary report directory
   * @param tempReportDir - Temporary directory where reports are generated
   */
  private copyReportAssets(tempReportDir: string): void {
    try {
      // Determine if we're running from compiled code or source
      // In compiled: __dirname = dist/src/e2eTest
      // In source: __dirname = src/e2eTest (when using ts-node)
      const isCompiled = __dirname.includes('dist');
      
      // Try to find assets in different locations (local dev vs packaged vs compiled)
      const assetPaths: string[] = [];
      
      if (isCompiled) {
        // Running from compiled code: dist/src/e2eTest -> dist/src/assets/reports
        assetPaths.push(resolve(__dirname, '../assets/reports'));
      } else {
        // Running from source: src/e2eTest -> src/assets/reports
        assetPaths.push(resolve(__dirname, '../assets/reports'));
      }
      
      // Add alternative paths based on current working directory
      const cwd = process.cwd();
      
      // If running from backend directory
      if (existsSync(resolve(cwd, 'src/assets/reports'))) {
        assetPaths.push(resolve(cwd, 'src/assets/reports'));
      }
      
      // If running from project root
      if (existsSync(resolve(cwd, 'sample-web-app/backend/src/assets/reports'))) {
        assetPaths.push(resolve(cwd, 'sample-web-app/backend/src/assets/reports'));
      }
      
      // If running from workspace root
      if (existsSync(resolve(cwd, 'dbk-devex-oidc-sso-toolkit/sample-web-app/backend/src/assets/reports'))) {
        assetPaths.push(resolve(cwd, 'dbk-devex-oidc-sso-toolkit/sample-web-app/backend/src/assets/reports'));
      }
      
      // Packaged runtime location (for Docker/ZIP)
      assetPaths.push(this.REPORT_ASSETS_PATH);

      let assetsDir: string | null = null;
      for (const path of assetPaths) {
        if (path && existsSync(path)) {
          assetsDir = path;
          break;
        }
      }

      if (!assetsDir) {
        // Assets directory doesn't exist, skip copying (not an error)
        // This is expected if assets haven't been set up yet
        return;
      }

      // Create assets subdirectory in temp report dir
      const reportAssetsDir = join(tempReportDir, 'assets');
      mkdirSync(reportAssetsDir, { recursive: true });

      // Copy logo if it exists (try PNG first, then SVG)
      const logoPngPath = join(assetsDir, 'logo.png');
      const logoSvgPath = join(assetsDir, 'logo.svg');
      try {
        if (existsSync(logoPngPath)) {
          const destPngPath = join(reportAssetsDir, 'logo.png');
          copyFileSync(logoPngPath, destPngPath);
          console.log(`Logo copied: ${logoPngPath} -> ${destPngPath}`);
        } else if (existsSync(logoSvgPath)) {
          const destSvgPath = join(reportAssetsDir, 'logo.svg');
          copyFileSync(logoSvgPath, destSvgPath);
          console.log(`Logo copied: ${logoSvgPath} -> ${destSvgPath}`);
        } else {
          console.warn('No logo file found at:', logoPngPath, 'or', logoSvgPath);
        }
      } catch (err: any) {
        console.warn('Could not copy logo file:', err?.message);
      }

      // Copy custom CSS if it exists
      const cssPath = join(assetsDir, 'custom-report.css');
      try {
        if (existsSync(cssPath)) {
          copyFileSync(cssPath, join(reportAssetsDir, 'custom-report.css'));
        }
      } catch (err: any) {
        console.warn('Could not copy CSS file:', err?.message);
      }
    } catch (err: any) {
      // Silently fail if assets can't be copied - not critical
      // This allows the validator to work even without custom assets
      console.warn('Could not copy report assets:', err?.message || err);
    }
  }

  /**
   * Gets the logo path relative to the report directory
   * @param tempReportDir - Temporary directory where reports are generated
   * @returns Relative path to logo or null if not found
   */
  private getLogoPath(tempReportDir: string): string | null {
    const logoPngPath = join(tempReportDir, 'assets', 'logo.png');
    const logoSvgPath = join(tempReportDir, 'assets', 'logo.svg');
    if (existsSync(logoPngPath)) {
      return 'assets/logo.png';
    } else if (existsSync(logoSvgPath)) {
      return 'assets/logo.svg';
    }
    return null;
  }

  /**
   * Executes Jest E2E tests and returns a zip buffer containing HTML & XML reports
   * @return Zip file buffer containing generated reports
   * @throws If tests fail or reports are not generated
   */
  async runE2ETestsAndZip(): Promise<Buffer> {
    const tempReportDir = mkdtempSync(join(os.tmpdir(), 'e2e-reports-'));
    try {
      // Copy report assets (logo, CSS) to temp directory
      this.copyReportAssets(tempReportDir);

      const reporters: JestReporter[] = [
        'default',
        ['jest-junit', { outputDirectory: tempReportDir, outputName: 'jest-e2e.xml' }],
      ];
      const isPackagedBackendRuntime = this.isPackagedBackendRuntime();
      const jestRootDir = this.getJestRootDirectory();
      /**
       * Inline Jest configuration to avoid filesystem-based config
       * resolution differences across runtime layouts.
       */
      const jestConfig = {
        moduleFileExtensions: ['js', 'json', 'ts'],
        rootDir: jestRootDir,
        testEnvironment: 'node',
        testRegex: '.e2e-spec.(ts|js)$',
        transform: isPackagedBackendRuntime
          ? {} // Compiled JS only (ZIP / Docker)
          : { '^.+\\.(t|j)s$': 'ts-jest' }, // Local / CI
        reporters,
      };
      /** Execute Jest tests */
      const { results } = await runCLI(
        { _: [], $0: 'jest-e2e', config: JSON.stringify(jestConfig), runInBand: true },
        ['.'],
      );
      if (!results) this.throwServiceError('No results returned from Jest', 500);
      if (results.numTotalTests === 0) this.throwServiceError('No E2E tests were executed', 422);
      
      /** Ensure XML report exists */
      const xmlReportPath = join(tempReportDir, 'jest-e2e.xml');
      if (!existsSync(xmlReportPath))
        this.throwServiceError('XML report was not generated correctly', 500);

      // Generate custom HTML report from XML
      const htmlReportPath = join(tempReportDir, 'e2e-report.html');
      this.generateCustomHtmlReport(xmlReportPath, htmlReportPath, tempReportDir);

      // Verify HTML report was created
      if (!existsSync(htmlReportPath))
        this.throwServiceError('HTML report was not generated correctly', 500);

      /** Create zip file buffer and return */
      return await this.createZipBufferFromDir(tempReportDir);
    } catch (error: any) {
      // Handle all errors via throwServiceError
      const message = error?.message || String(error) || 'Unknown error';
      const status = error?.status || 500;
      this.throwServiceError(message, status);
    } finally {
      this.cleanupTempFolder(tempReportDir);
    }
  }

  /**
   * Creates a ZIP archive buffer containing all files and subdirectories from the provided directory path
   * @param dirPath - Absolute path to the directory to be archived
   * @returns Promise resolving to a ZIP file buffer
   * @throws If the directory does not exist or archiving fails
   */
  private createZipBufferFromDir(dirPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        if (!existsSync(dirPath)) {
          return reject(new Error(`Report directory not found: ${dirPath}`));
        }
        const archive = archiver('zip', { zlib: { level: 9 } });
        const chunks: Buffer[] = [];
        // accumulate zip binary data into memory
        archive.on('data', (chunk: Buffer) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', (err: Error) => reject(err));
        // add the whole directory contents into the archive root
        archive.directory(dirPath, false);
        // finalize the archive (starts writing)
        archive.finalize();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Deletes a temporary folder safely
   * @param folderPath - Path to folder to remove
   */
  private cleanupTempFolder(folderPath: string): void {
    try {
      if (existsSync(folderPath)) rmSync(folderPath, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Failed to cleanup temporary folder ${folderPath}:`, err);
    }
  }

  /**
   * Generates a custom HTML report from XML test results
   * @param xmlReportPath - Path to the XML report file
   * @param htmlReportPath - Path where HTML report will be written
   * @param tempReportDir - Temporary directory containing assets
   */
  private generateCustomHtmlReport(
    xmlReportPath: string,
    htmlReportPath: string,
    tempReportDir: string,
  ): void {
    try {
      const xmlContent = readFileSync(xmlReportPath, 'utf-8');
      
      // Parse XML to extract test data
      const testData = this.parseXmlReport(xmlContent);
      
      // Get logo path if available
      const logoPath = this.getLogoPath(tempReportDir);
      
      // Generate HTML content
      const htmlContent = this.generateHtmlContent(testData, logoPath, tempReportDir);
      
      writeFileSync(htmlReportPath, htmlContent, 'utf-8');
      console.log('Custom HTML report generated successfully');
    } catch (err: any) {
      console.warn('Could not generate custom HTML report:', err?.message || err);
      // Fallback: create a simple HTML file
      const fallbackHtml = `<!DOCTYPE html>
<html>
<head>
  <title>E2E Test Report</title>
  <meta charset="utf-8">
</head>
<body>
  <h1>E2E Test Report</h1>
  <p>Report generation encountered an error. Please check the XML report.</p>
</body>
</html>`;
      writeFileSync(htmlReportPath, fallbackHtml, 'utf-8');
    }
  }

  /**
   * Parses XML report to extract test case data
   */
  private parseXmlReport(xmlContent: string): {
    testCases: Array<{
      name: string;
      status: 'passed' | 'failed' | 'skipped';
      time: number;
      failureMessage?: string;
    }>;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    totalTime: number;
  } {
    const testCases: Array<{
      name: string;
      status: 'passed' | 'failed' | 'skipped';
      time: number;
      failureMessage?: string;
    }> = [];
    
    let totalTime = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // Parse XML by finding all testcase elements
    const testCasePattern = /<testcase\s+([^>]+)>([\s\S]*?)<\/testcase>/g;
    let match;

    while ((match = testCasePattern.exec(xmlContent)) !== null) {
      const attributes = match[1];
      const content = match[2];

      // Extract attributes
      const nameMatch = attributes.match(/name="([^"]*)"/) || attributes.match(/name='([^']*)'/);
      const timeMatch = attributes.match(/time="([^"]*)"/) || attributes.match(/time='([^']*)'/);
      const classNameMatch = attributes.match(/classname="([^"]*)"/) || attributes.match(/classname='([^']*)'/);

      const name = nameMatch ? nameMatch[1] : 'Unknown Test';
      const time = timeMatch ? parseFloat(timeMatch[1]) : 0;
      totalTime += time;

      // Check for failure or skipped
      let status: 'passed' | 'failed' | 'skipped' = 'passed';
      let failureMessage: string | undefined;

      if (/<skipped[^>]*>/.test(content) || /<skipped[^>]*\/>/.test(attributes)) {
        status = 'skipped';
        skipped++;
      } else {
        const failureMatch = content.match(/<failure[^>]*>([\s\S]*?)<\/failure>/);
        if (failureMatch) {
          status = 'failed';
          failed++;
          failureMessage = failureMatch[1].trim();
        } else {
          passed++;
        }
      }

      testCases.push({
        name,
        status,
        time,
        failureMessage,
      });
    }

    return {
      testCases,
      totalTests: testCases.length,
      passed,
      failed,
      skipped,
      totalTime,
    };
  }

  /**
   * Generates HTML content for the test report
   */
  private generateHtmlContent(
    testData: {
      testCases: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        time: number;
        failureMessage?: string;
      }>;
      totalTests: number;
      passed: number;
      failed: number;
      skipped: number;
      totalTime: number;
    },
    logoPath: string | null,
    tempReportDir: string,
  ): string {
    const logoHtml = logoPath
      ? `<img src="${logoPath}" alt="Logo" id="validator-logo" style="position: fixed; top: 0.5rem; left: 0.5rem; max-height: 60px; max-width: 200px; z-index: 99999; height: auto; width: auto; object-fit: contain; display: block !important; visibility: visible !important; background: transparent;" />`
      : '';

    const testRows = testData.testCases
      .map(
        (testCase) => `
      <tr class="test-row ${testCase.status}">
        <td class="test-name">
          ${this.escapeHtml(testCase.name)}
          ${testCase.failureMessage ? `<div class="failure-message">${this.escapeHtml(testCase.failureMessage)}</div>` : ''}
        </td>
        <td class="test-status">
          <span class="status-badge ${testCase.status}">${testCase.status.toUpperCase()}</span>
        </td>
        <td class="test-time">${testCase.time.toFixed(3)}s</td>
      </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OIDC SSO Validator Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #212529;
      background-color: #ffffff;
      padding: 2rem;
      padding-top: 5rem;
    }

    #validator-logo {
      position: fixed;
      top: 0.5rem;
      left: 0.5rem;
      max-height: 60px;
      max-width: 200px;
      z-index: 99999;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      font-size: 2rem;
      font-weight: 600;
      color: #212529;
      margin-bottom: 2rem;
      text-align: center;
    }

    .test-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding: 1.5rem;
      background-color: #ffffff;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 100px;
    }

    .summary-label {
      font-size: 0.75rem;
      color: #6c757d;
      font-weight: 400;
    }

    .summary-value {
      font-size: 1.2rem;
      font-weight: 700;
      color: #212529;
    }

    .summary-value.passed {
      color: #28a745;
    }

    .summary-value.failed {
      color: #dc3545;
    }

    .summary-value.skipped {
      color: #ffc107;
    }

    .test-table-container {
      width: 100%;
      overflow-x: auto;
      background-color: #ffffff;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .test-cases-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .test-cases-table thead {
      background-color: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
    }

    .test-cases-table th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #243a51;
      font-size: 0.9rem;
    }

    .test-cases-table tbody tr {
      border-bottom: 1px solid #e9ecef;
      transition: background-color 0.1s;
    }

    .test-cases-table tbody tr:hover {
      background-color: #f8f9fa;
    }

    .test-cases-table tbody tr.passed {
      background-color: rgba(40, 167, 69, 0.05);
    }

    .test-cases-table tbody tr.failed {
      background-color: rgba(220, 53, 69, 0.05);
    }

    .test-cases-table tbody tr.skipped {
      background-color: rgba(255, 193, 7, 0.05);
    }

    .test-cases-table td {
      padding: 1rem;
      color: #2a2a2a;
    }

    .test-name {
      font-weight: 400;
      word-break: break-word;
    }

    .failure-message {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background-color: rgba(220, 53, 69, 0.1);
      border-left: 3px solid #dc3545;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      color: #721c24;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
    }

    .test-status {
      text-align: center;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.passed {
      background-color: #28a745;
      color: #ffffff;
    }

    .status-badge.failed {
      background-color: #dc3545;
      color: #ffffff;
    }

    .status-badge.skipped {
      background-color: #ffc107;
      color: #212529;
    }

    .test-time {
      text-align: right;
      font-family: 'Courier New', monospace;
      color: #6c757d;
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
        padding-top: 4rem;
      }

      .test-summary {
        flex-direction: column;
        gap: 1rem;
      }

      .test-cases-table {
        font-size: 0.75rem;
      }

      .test-cases-table th,
      .test-cases-table td {
        padding: 0.75rem;
      }
    }
  </style>
</head>
<body>
  ${logoHtml}
  <div class="container">
    <h1>OIDC SSO Validator Dashboard</h1>
    
    <!-- Test Summary -->
    <div class="test-summary">
      <div class="summary-item">
        <span class="summary-label">Total Tests:</span>
        <span class="summary-value">${testData.totalTests}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Passed:</span>
        <span class="summary-value passed">${testData.passed}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Failed:</span>
        <span class="summary-value failed">${testData.failed}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Skipped:</span>
        <span class="summary-value skipped">${testData.skipped}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Time:</span>
        <span class="summary-value">${testData.totalTime.toFixed(2)}s</span>
      </div>
    </div>

    <!-- Test Cases Table -->
    <div class="test-table-container">
      <table class="test-cases-table">
        <thead>
          <tr>
            <th>Test Case</th>
            <th>Status</th>
            <th>Execution Time</th>
          </tr>
        </thead>
        <tbody>
          ${testRows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Escapes HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Injects custom CSS and logo into the generated HTML report (DEPRECATED - kept for reference)
   * @param htmlReportPath - Path to the generated HTML report
   * @param tempReportDir - Temporary directory containing assets
   */
  private injectCustomCSS(htmlReportPath: string, tempReportDir: string): void {
    try {
      const customCssPath = join(tempReportDir, 'assets', 'custom-report.css');
      const logoPngPath = join(tempReportDir, 'assets', 'logo.png');
      const logoSvgPath = join(tempReportDir, 'assets', 'logo.svg');
      
      let htmlContent = readFileSync(htmlReportPath, 'utf-8');
      let customCss = '';
      let logoHtml = '';

      // Read custom CSS if it exists
      if (existsSync(customCssPath)) {
        customCss = readFileSync(customCssPath, 'utf-8');
      }

      // Determine logo path and create HTML
      let logoPath: string | null = null;
      if (existsSync(logoPngPath)) {
        logoPath = 'assets/logo.png';
      } else if (existsSync(logoSvgPath)) {
        logoPath = 'assets/logo.svg';
      }

      if (logoPath) {
        // Create logo HTML - inject at the very beginning of body or header
        // Position: fixed at top-left corner (0,0 with small padding)
        logoHtml = `<img src="${logoPath}" alt="Logo" id="validator-logo" style="position: fixed; top: 0.5rem; left: 0.5rem; max-height: 60px; max-width: 200px; z-index: 99999; height: auto; width: auto; object-fit: contain; display: block !important; visibility: visible !important; background: transparent;" />`;
        console.log(`Logo HTML prepared with path: ${logoPath}`);
      } else {
        console.warn('No logo path available for injection');
      }

      // Inject CSS in the <head> section
      if (customCss) {
        // Add CSS to hide custom info section if it exists
        const hideInfoSectionCss = `
/* Hide custom info section */
.jest-html-reporters-custom-info,
[class*="custom-info"],
[class*="customInfos"],
[class*="custom-infos"],
div[class*="info"]:not([class*="test"]):not([class*="suite"]) {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  overflow: hidden !important;
}`;
        const cssInjection = `<style type="text/css" id="custom-validator-styles">\n${customCss}\n${hideInfoSectionCss}\n</style>`;
        
        if (htmlContent.includes('</head>')) {
          htmlContent = htmlContent.replace('</head>', `${cssInjection}\n</head>`);
        } else if (htmlContent.includes('<head>')) {
          htmlContent = htmlContent.replace('<head>', `<head>\n${cssInjection}`);
        }
      }

      // Inject logo at the beginning of body or header - multiple strategies
      if (logoHtml) {
        let logoInjected = false;
        
        // Strategy 1: Inject right after <body> tag (most reliable)
        if (htmlContent.includes('<body')) {
          // Handle both <body> and <body class="...">
          htmlContent = htmlContent.replace(/(<body[^>]*>)/i, `$1\n${logoHtml}`);
          logoInjected = true;
          console.log('Logo injected after <body> tag');
        }
        
        // Strategy 2: If body injection didn't work, try header
        if (!logoInjected && htmlContent.includes('<header')) {
          htmlContent = htmlContent.replace(/(<header[^>]*>)/i, `${logoHtml}\n$1`);
          logoInjected = true;
          console.log('Logo injected before <header> tag');
        }
        
        // Strategy 3: Inject at the very beginning of HTML
        if (!logoInjected) {
          htmlContent = `${logoHtml}\n${htmlContent}`;
          console.log('Logo injected at beginning of HTML');
        }
        
        // Also add logo via CSS as backup (using ::before pseudo-element)
        if (customCss && logoPath) {
          const logoCssBackup = `
/* Logo backup via CSS - Top Left Corner */
body::before {
  content: '';
  display: block;
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  width: 200px;
  height: 60px;
  background-image: url('${logoPath}');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: left top;
  z-index: 99998;
  pointer-events: none;
}`;
          // Inject logo CSS into existing style tag
          htmlContent = htmlContent.replace(
            /(<style[^>]*id="custom-validator-styles"[^>]*>)/i,
            `$1\n${logoCssBackup}\n`
          );
        }
      }

      // Inject JavaScript to lock colors and prevent dynamic changes
      const colorLockScript = `
<script type="text/javascript">
(function() {
  'use strict';
  
  // Lock all chart colors to static values - NEVER CHANGE
  const STATIC_COLORS = Object.freeze({
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    primary: '#0066cc',
    secondary: '#004499',
    // Chart color mapping - always use these exact colors
    chartColors: ['#28a745', '#dc3545', '#ffc107', '#0066cc', '#17a2b8', '#004499']
  });

  // Intercept Math.random to prevent random color generation
  const originalRandom = Math.random;
  let randomCallCount = 0;
  Math.random = function() {
    randomCallCount++;
    // For color generation, return predictable values
    if (randomCallCount % 10 < 6) {
      return 0.3; // Maps to our static colors
    }
    return originalRandom();
  };

  // Override Chart.js or similar library color generation
  function lockChartColors() {
    // Lock SVG colors - run multiple times to catch all updates
    function lockSVGColors() {
      const svgs = document.querySelectorAll('svg');
      svgs.forEach(function(svg) {
        const paths = svg.querySelectorAll('path, circle, rect, ellipse, polygon');
        paths.forEach(function(path, index) {
          // Force static colors based on index (deterministic)
          const colorIndex = index % STATIC_COLORS.chartColors.length;
          const staticColor = STATIC_COLORS.chartColors[colorIndex];
          
          // Override fill
          if (path.getAttribute('fill') !== 'none' && path.getAttribute('fill') !== 'transparent') {
            path.setAttribute('fill', staticColor);
            path.style.setProperty('fill', staticColor, 'important');
          }
          
          // Override stroke if present
          const stroke = path.getAttribute('stroke');
          if (stroke && stroke !== 'none') {
            path.setAttribute('stroke', staticColor);
            path.style.setProperty('stroke', staticColor, 'important');
          }
        });
      });
    }

    // Lock canvas colors
    function lockCanvasColors() {
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(function(canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Override fillStyle setter
          const originalFillStyleDescriptor = Object.getOwnPropertyDescriptor(ctx, 'fillStyle') || 
            Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), 'fillStyle');
          
          if (!ctx._fillStyleLocked) {
            Object.defineProperty(ctx, 'fillStyle', {
              get: function() { 
                return this._lockedFillStyle || this._originalFillStyle || '#000000'; 
              },
              set: function(value) {
                this._originalFillStyle = value;
                // Map to static colors
                if (typeof value === 'string') {
                  const colorIndex = (this._colorIndex || 0) % STATIC_COLORS.chartColors.length;
                  this._lockedFillStyle = STATIC_COLORS.chartColors[colorIndex];
                  this._colorIndex = (this._colorIndex || 0) + 1;
                } else {
                  this._lockedFillStyle = value;
                }
              },
              configurable: true
            });
            ctx._fillStyleLocked = true;
          }
        }
      });
    }

    // Run immediately and repeatedly
    lockSVGColors();
    lockCanvasColors();
    
    // Run again after a delay to catch late-rendered charts
    setTimeout(function() {
      lockSVGColors();
      lockCanvasColors();
    }, 100);
    
    setTimeout(function() {
      lockSVGColors();
      lockCanvasColors();
    }, 500);
    
    setTimeout(function() {
      lockSVGColors();
      lockCanvasColors();
    }, 1000);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lockChartColors);
  } else {
    lockChartColors();
  }

  // Also run on window load
  window.addEventListener('load', function() {
    setTimeout(lockChartColors, 100);
  });

  // MutationObserver to catch any dynamic changes
  const observer = new MutationObserver(function(mutations) {
    let shouldRelock = false;
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target && (target.tagName === 'path' || target.tagName === 'circle' || 
                       target.tagName === 'rect' || target.tagName === 'svg')) {
          shouldRelock = true;
        }
      } else if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && (node.tagName === 'svg' || node.tagName === 'canvas')) {
            shouldRelock = true;
          }
        });
      }
    });
    
    if (shouldRelock) {
      setTimeout(lockChartColors, 50);
    }
  });

  // Start observing
  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['fill', 'stroke', 'style'],
      childList: true,
      subtree: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['fill', 'stroke', 'style'],
        childList: true,
        subtree: true
      });
    });
  }

  // Intercept common chart library color functions
  if (typeof window !== 'undefined') {
    // Override Chart.js if present
    if (window.Chart && window.Chart.defaults) {
      window.Chart.defaults.global.defaultColor = STATIC_COLORS.chartColors[0];
      if (window.Chart.defaults.global.elements) {
        window.Chart.defaults.global.elements.arc.backgroundColor = STATIC_COLORS.chartColors;
      }
    }
  }
})();
</script>`;

      // Inject JavaScript before closing </body>
      if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', `${colorLockScript}\n</body>`);
      } else if (htmlContent.includes('</html>')) {
        htmlContent = htmlContent.replace('</html>', `${colorLockScript}\n</html>`);
      }

      writeFileSync(htmlReportPath, htmlContent, 'utf-8');
      console.log('Custom CSS and logo injected successfully into report');
    } catch (err: any) {
      // Log error but don't fail - validator should still work
      console.warn('Could not inject custom CSS/logo:', err?.message || err);
    }
  }

  /**
   * Throws a structured service error
   * @param message - Error message
   * @param status - HTTP status code (default: 400)
   * @throws ServiceError
   */
  private throwServiceError(message: string, status = 500): never {
    throw { message, status } as ServiceError;
  }
}
