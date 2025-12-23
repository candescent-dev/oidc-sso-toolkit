import React, { FC, useState, useEffect, useRef } from 'react';
import { getApi } from '../../services/api';
import codeIcon from '../../assets/code.svg';
import downloadIcon from '../../assets/download.svg';
import playIcon from '../../assets/playCircle.svg';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchE2EReports,
  setPublishOidcSettingLoading,
  resetOidcValidatorState,
} from '../../features/oidcValidator/oidcValidatorSlice';
import './OidcValidatorPage.css';

const OidcValidatorPage: FC = () => {
  const dispatch = useAppDispatch();
  const { runValidatorLoading, publishOidcSettingLoading, htmlFileUrl, xmlFileUrl, testReport } =
    useAppSelector((state) => state.oidcValidator);

  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const downloadTimerRef = useRef<number | null>(null);

  // Cleanup Blob URLs and timer on unmount
  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      if (htmlFileUrl) URL.revokeObjectURL(htmlFileUrl);
      if (xmlFileUrl) URL.revokeObjectURL(xmlFileUrl);
      dispatch(resetOidcValidatorState());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-hide download message after 10s
  useEffect(() => {
    if (!downloadMessage) return;
    const timer = setTimeout(() => setDownloadMessage(null), 10000);
    return () => clearTimeout(timer);
  }, [downloadMessage]);

  /** Download config.json file */
  const handlePublishOIDCSetting = async (): Promise<void> => {
    try {
      dispatch(setPublishOidcSettingLoading(true));
      const api = getApi();
      const response = await api.get<Blob>('publish-config', { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'oidcConfig.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = window.setTimeout(() => {
        setDownloadMessage('oidcConfig.json downloaded successfully');
        dispatch(setPublishOidcSettingLoading(false));
      }, 2000);
    } catch (error: any) {
      dispatch(setPublishOidcSettingLoading(false));
      let message = 'Something went wrong. Please try again later';
      if (error.response && error.response.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const json = JSON.parse(text);
          message = json.message || message;
        } catch {
          message = text || message;
        }
      } else {
        message = error?.message || message;
      }
      setDownloadMessage(message);
    }
  };

  /** Run E2E validator and fetch reports */
  const handleRunValidator = async (): Promise<void> => {
    const result = await dispatch(fetchE2EReports());
    if (fetchE2EReports.rejected.match(result)) {
      setDownloadMessage(
        result.payload?.error || 'Server Error: Something went wrong. Please try again later'
      );
    }
  };

  /** Generic file download handler with success message */
  const handleDownloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
    downloadTimerRef.current = window.setTimeout(() => {
      setDownloadMessage(`${filename} file is downloaded`);
    }, 500);
  };

  return (
    <>
      <div className="validator-container">
        {/* Header */}
        <div className="validator-header-row">
          <h1>OIDC Validator</h1>
          <p className="heading-message">Validate and publish your OIDC configuration setting</p>
        </div>
        <div className="divider" />
        {/* Run Validator Button */}
        <button
          className="run-validator-btn"
          onClick={handleRunValidator}
          disabled={runValidatorLoading}
        >
          {runValidatorLoading ? (
            <>
              Validating...
              <span className="spinner" />
            </>
          ) : (
            <>
              Run Validator <img src={playIcon} className="download-icon" alt="Run" />
            </>
          )}
        </button>
        {/* Validation Report Section */}
        <div className="text-with-icon">
          <img src={codeIcon} className="download-icon" alt="Report" />
          <span className="title-label">Validation Report</span>
        </div>
        <div className="run-container">
          {!testReport ? (
            <p>Click 'Run Validator' to start validation</p>
          ) : (
            <>
              {/* Test Summary */}
              <div className="test-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Tests:</span>
                  <span className="summary-value">{testReport.totalTests}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Passed:</span>
                  <span className="summary-value passed">{testReport.passed}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Failed:</span>
                  <span className="summary-value failed">{testReport.failed}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Skipped:</span>
                  <span className="summary-value skipped">{testReport.skipped}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Time:</span>
                  <span className="summary-value">{testReport.totalTime.toFixed(2)}s</span>
                </div>
              </div>

              {/* Test Cases Table */}
              <div className="test-table-container">
                <table className="test-cases-table">
                  <thead>
                    <tr>
                      <th>Test Case</th>
                      <th>Status</th>
                      <th>Execution Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testReport.testCases.map((testCase, index) => (
                      <tr key={index} className={`test-row ${testCase.status}`}>
                        <td className="test-name">
                          {testCase.name}
                          {testCase.failureMessage && (
                            <div className="failure-message">{testCase.failureMessage}</div>
                          )}
                        </td>
                        <td className="test-status">
                          <span className={`status-badge ${testCase.status}`}>
                            {testCase.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="test-time">{testCase.executionTime.toFixed(3)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </>
          )}
        </div>
        {/* Download Report Buttons (Shown after successful API call) */}
        {htmlFileUrl && xmlFileUrl && (
          <>
            <div className="text-with-icon">
              <span className="title-label">Download Reports</span>
            </div>
            <div className="validator-button-row">
              <button
                type="button"
                className="validator-icon-button"
                onClick={() => handleDownloadFile(htmlFileUrl, 'e2e-report.html')}
              >
                <img
                  src={downloadIcon}
                  className="download-icon"
                  alt="Download HTML"
                  loading="lazy"
                />
                e2e-report.html
              </button>
              <button
                type="button"
                className="validator-icon-button"
                onClick={() => handleDownloadFile(xmlFileUrl, 'jest-e2e.xml')}
              >
                <img
                  src={downloadIcon}
                  className="download-icon"
                  alt="Download XML"
                  loading="lazy"
                />
                jest-e2e.xml
              </button>
            </div>
          </>
        )}
        <div className="divider" />
        {/* Publish OIDC Setting */}
        <button
          className="green-btn"
          onClick={handlePublishOIDCSetting}
          disabled={publishOidcSettingLoading || !htmlFileUrl || !xmlFileUrl}
        >
          {publishOidcSettingLoading ? (
            <>
              Publishing...
              <span className="spinner" />
            </>
          ) : (
            'Publish OIDC Setting'
          )}
        </button>
        {!htmlFileUrl && !xmlFileUrl && (
          <p className="description-message">
            Complete validation to enable ‘Publish OIDC Setting’
          </p>
        )}
      </div>
      {/* Download Message Toast */}
      {downloadMessage && (
        <div className="download-toast">
          <span>{downloadMessage}</span>
          <button className="toast-close" onClick={() => setDownloadMessage(null)}>
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default OidcValidatorPage;
