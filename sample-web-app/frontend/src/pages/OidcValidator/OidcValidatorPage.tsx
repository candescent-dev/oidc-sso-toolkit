import React, { FC, useState, useEffect, useRef } from 'react';
import downloadIcon from '../../assets/download.svg';
import playIcon from '../../assets/playCircle.svg';
import codeIcon from '../../assets/code.svg';
import { getApi } from '../../services/api';
import { setLoading } from '../../features/home/homeSlice';
import { useAppDispatch, useAppSelector } from '../../app/hooks';

import './OidcValidatorPage.css';

const OidcValidatorPage: FC = () => {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.home);

  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const downloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) {
        clearTimeout(downloadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (downloadMessage) {
      const timer = setTimeout(() => setDownloadMessage(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [downloadMessage]);

  const handlePublishOIDCSetting = async (): Promise<void> => {
    try {
      const api = getApi();
      const response = await api.get<Blob>('publish-config', { responseType: 'blob' });
      dispatch(setLoading(true));
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'config.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = window.setTimeout(() => {
        setDownloadMessage('config.json downloaded');
        dispatch(setLoading(false));
      }, 2000);
    } catch (error: any) {
      dispatch(setLoading(false));
      if (error.response && error.response.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const json = JSON.parse(text);
          setDownloadMessage(json.message || 'Server error occurred');
        } catch {
          setDownloadMessage(text || 'Server error occurred');
        }
      } else {
        setDownloadMessage(error?.message || 'Something went wrong while downloading');
      }
    }
  };

  return (
    <>
      <div className="home-container">
        <div className="header-row">
          <h1>OIDC Validator</h1>
          <p className="heading-message">Validate and publish your OIDC configuration setting</p>
        </div>
        <div className="divider"></div>
        {/* Run Validator Button */}
        <button className="submit-btn" onClick={() => {}}>
          Run Validator
          <img src={playIcon} className="download-icon" alt="Download" />
        </button>
        {/* Validation Report */}
        <div className="text-with-icon">
          <img src={codeIcon} className="download-icon" alt="Download" />
          <span className="title-label">Validation Report</span>
        </div>
        <div className="run-container">
          <p>Click ‘Run Validator’ to start validation</p>
        </div>
        {/* Download Report Section */}
        <div className="text-with-icon">
          <span className="title-label">Download Report</span>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="icon-button"
            data-testid="metadata-button"
            onClick={() => {}}
          >
            <img src={downloadIcon} className="download-icon" alt="Download" loading="lazy" />
            validator-report.html
          </button>
          <button type="button" className="icon-button" data-testid="jwk-button" onClick={() => {}}>
            <img src={downloadIcon} className="download-icon" alt="Download" loading="lazy" />
            validator-report.json
          </button>
        </div>
        <div className="divider" />
        {/* Publish OIDC Setting Button */}
        <button className="green-btn" onClick={handlePublishOIDCSetting}>
          {loading ? <span className="spinner" /> : ' Publish OIDC Setting'}
        </button>
      </div>
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
