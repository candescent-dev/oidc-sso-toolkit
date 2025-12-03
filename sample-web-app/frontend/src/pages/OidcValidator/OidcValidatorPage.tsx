import React, { FC, useState, useEffect, useRef } from 'react';
import downloadIcon from '../../assets/download.svg';
import playIcon from '../../assets/playCircle.svg';
import codeIcon from '../../assets/code.svg';
import { getApi } from '../../services/api';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  setLoading,
  fetchE2EReports,
  resetE2EReportsState,
} from '../../features/oidcValidator/oidcValidatorSlice';

import './OidcValidatorPage.css';

const OidcValidatorPage: FC = () => {
  const dispatch = useAppDispatch();
  const { loading, htmlFileUrl, xmlFileUrl } = useAppSelector((state) => state.oidcValidator);

  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const downloadTimerRef = useRef<number | null>(null);

  // Cleanup Blob URLs and timer on unmount
  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      if (htmlFileUrl) URL.revokeObjectURL(htmlFileUrl);
      if (xmlFileUrl) URL.revokeObjectURL(xmlFileUrl);
      dispatch(resetE2EReportsState());
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
      dispatch(setLoading(true));
      const api = getApi();
      const response = await api.get<Blob>('publish-config', { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'config.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = window.setTimeout(() => {
        setDownloadMessage('config.json downloaded successfully');
        dispatch(setLoading(false));
      }, 2000);
    } catch (error: any) {
      dispatch(setLoading(false));
      let message = 'Something went wrong while downloading';
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
  const handleRunValidator = (): void => {
    dispatch(fetchE2EReports());
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
      setDownloadMessage(`${filename} downloaded successfully`);
    }, 2000);
  };

  return (
    <>
      <div className="home-container">
        {/* Header */}
        <div className="header-row">
          <h1>OIDC Validator</h1>
          <p className="heading-message">Validate and publish your OIDC configuration setting</p>
        </div>
        <div className="divider" />
        {/* Run Validator Button */}
        <button className="submit-btn" onClick={handleRunValidator} disabled={loading}>
          {loading ? 'Running...' : 'Run Validator'}
          <img src={playIcon} className="download-icon" alt="Run" />
        </button>
        {/* Validation Report Section */}
        <div className="text-with-icon">
          <img src={codeIcon} className="download-icon" alt="Report" />
          <span className="title-label">Validation Report</span>
        </div>
        <div className="run-container">
          <p>Click ‘Run Validator’ to start validation</p>
        </div>
        {/* Download Report Buttons (Shown after successful API call) */}
        {htmlFileUrl && xmlFileUrl && (
          <>
            <div className="text-with-icon">
              <span className="title-label">Download Report</span>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="icon-button"
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
                className="icon-button"
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
        <button className="green-btn" onClick={handlePublishOIDCSetting} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Publish OIDC Setting'}
        </button>
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
