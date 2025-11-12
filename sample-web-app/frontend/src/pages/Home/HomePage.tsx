import React, { FC, useEffect, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useNavigate } from 'react-router-dom';
import {
  setCredentials,
  setLoading,
  setError,
  setHomeConfigData,
} from '../../features/home/homeSlice';
import type { IframeSettings, Permissions } from '../../features/home/types';
import { validateUrl } from '../../utils/helpers';
import { OpenMode } from '../../features/home/types';
import downloadIcon from '../../assets/download.svg';
import api from '../../services/api';
import './HomePage.css';

enum DownloadType {
  METADATA = 'metadata',
  JWK = 'JWK',
}

const HomePage: FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { clientId, clientSecret, loading, error } = useAppSelector((state) => state.home);

  const [initUrl, setInitUrl] = useState<string>('');
  const [callbackHost, setCallbackHost] = useState<string>('');
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [openOption, setOpenOption] = useState<'' | OpenMode>('');
  const [uniqueId, setUniqueId] = useState<string>('');
  const [displayWidth, setDisplayWidth] = useState<string>('');
  const [permissions, setPermissions] = useState<Permissions>({
    enableCamera: false,
    enableMic: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    initUrl: string | null;
    callbackHost: string | null;
    displayWidth: string | null;
    uniqueId: string | null;
    openOption: string | null;
  }>({
    initUrl: null,
    callbackHost: null,
    displayWidth: null,
    uniqueId: null,
    openOption: null,
  });

  const downloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) {
        clearTimeout(downloadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchClientCredentials = async (): Promise<void> => {
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        const response = await api.post('/client');
        dispatch(
          setCredentials({
            clientId: response.data.client_id,
            clientSecret: response.data.client_secret,
          })
        );
      } catch (err: any) {
        // Check if the error has a response from backend
        if (err.response && err.response.data) {
          // Use the message from backend
          dispatch(setError(err.response.data.message || 'An unknown error occurred'));
        } else {
          // Fallback if it's a network error or something else
          dispatch(setError('Error fetching credentials from the server'));
        }
      } finally {
        dispatch(setLoading(false));
      }
    };
    fetchClientCredentials();
  }, [dispatch]);

  useEffect(() => {
    if (downloadMessage) {
      const timer = setTimeout(() => setDownloadMessage(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [downloadMessage]);

  /* ----------------------------- Input Handlers ----------------------------- */
  const handleInitUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setInitUrl(value);
    if (!value.trim()) {
      setFieldErrors((prev) => ({ ...prev, initUrl: 'Init URL is required' }));
    } else if (!validateUrl(value)) {
      setFieldErrors((prev) => ({ ...prev, initUrl: 'Invalid URL' }));
    } else {
      setFieldErrors((prev) => ({ ...prev, initUrl: null }));
    }
  };

  const handleCallbackHostChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setCallbackHost(value);
    if (!value.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        callbackHost: 'Callback Host is required',
      }));
    } else if (!validateUrl(value)) {
      setFieldErrors((prev) => ({ ...prev, callbackHost: 'Invalid URL' }));
    } else {
      setFieldErrors((prev) => ({ ...prev, callbackHost: null }));
    }
  };

  const handleDownloadClick = (fileType: DownloadType) => {
    if (downloadTimerRef.current) {
      clearTimeout(downloadTimerRef.current);
    }
    downloadTimerRef.current = window.setTimeout(() => {
      if (fileType === DownloadType.METADATA) setDownloadMessage('metadata.json downloaded');
      else if (fileType === DownloadType.JWK) setDownloadMessage('JWK.json downloaded');
    }, 2000);
  };

  const handleDisplayWidthChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setDisplayWidth(value);
    if (!value.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        displayWidth: 'Display Width is required',
      }));
    } else {
      const width = parseInt(value, 10);
      if (isNaN(width) || width < 20 || width > 100) {
        setFieldErrors((prev) => ({
          ...prev,
          displayWidth: 'Value must be between 20 and 100',
        }));
      } else {
        setFieldErrors((prev) => ({ ...prev, displayWidth: null }));
      }
    }
  };

  const handleUniqueIdChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setUniqueId(value);
    if (!value.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        uniqueId: 'Unique ID is required',
      }));
    } else {
      setFieldErrors((prev) => ({ ...prev, uniqueId: null }));
    }
  };

  const isFormValid = (): boolean => {
    if (!clientId || !clientSecret) return false;
    if (!validateUrl(initUrl) || !validateUrl(callbackHost)) return false;
    if (!openOption) return false;
    if (openOption === OpenMode.IFRAME) {
      const width = parseInt(displayWidth, 10);
      if (!uniqueId.trim() || isNaN(width) || width < 20 || width > 100) return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    let hasError = false;
    // Init URL Validation
    if (!initUrl.trim()) {
      setFieldErrors((prev) => ({ ...prev, initUrl: 'Init URL is required' }));
      hasError = true;
    } else if (!validateUrl(initUrl)) {
      setFieldErrors((prev) => ({ ...prev, initUrl: 'Invalid URL' }));
      hasError = true;
    } else {
      setFieldErrors((prev) => ({ ...prev, initUrl: null }));
    }
    // Callback Host Validation
    if (!callbackHost.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        callbackHost: 'Callback Host is required',
      }));
      hasError = true;
    } else if (!validateUrl(callbackHost)) {
      setFieldErrors((prev) => ({ ...prev, callbackHost: 'Invalid URL' }));
      hasError = true;
    } else {
      setFieldErrors((prev) => ({ ...prev, callbackHost: null }));
    }
    // Option Validation
    if (!openOption) {
      setFieldErrors((prev) => ({
        ...prev,
        openOption: 'Please select an option',
      }));
      hasError = true;
    } else {
      setFieldErrors((prev) => ({ ...prev, openOption: null }));
    }
    if (openOption === OpenMode.IFRAME) {
      if (!uniqueId.trim()) {
        setFieldErrors((prev) => ({
          ...prev,
          uniqueId: 'Unique ID is required',
        }));
        hasError = true;
      }
      if (!displayWidth.trim()) {
        setFieldErrors((prev) => ({
          ...prev,
          displayWidth: 'Display Width is required',
        }));
        hasError = true;
      } else {
        const width = parseInt(displayWidth, 10);
        if (isNaN(width) || width < 20 || width > 100) {
          setFieldErrors((prev) => ({
            ...prev,
            displayWidth: 'Value must be between 20 and 100',
          }));
          hasError = true;
        }
      }
    }
    if (hasError) return;
    const iframeSettings: IframeSettings | undefined =
      openOption === OpenMode.IFRAME ? { uniqueId, displayWidth, permissions } : undefined;
    const homeConfigData = {
      initUrl,
      callbackHost,
      openOption,
      iframeSettings,
    };
    dispatch(setHomeConfigData(homeConfigData));
    // Reset
    setInitUrl('');
    setCallbackHost('');
    setOpenOption('');
    setUniqueId('');
    setDisplayWidth('');
    setPermissions({ enableCamera: false, enableMic: false });
    setFieldErrors({
      initUrl: null,
      callbackHost: null,
      displayWidth: null,
      uniqueId: null,
      openOption: null,
    });
    navigate('/startOidcSso');
  };

  if (loading) return <div className="loader">Fetching Client Credentials......</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <>
      <div className="auto-reload-message">
        This page will automatically reload after 5 minutes, as the client_id and client_secret
        expire and are regenerated every 5 minutes.
      </div>
      <div className="home-container">
        <div className="header-row">
          <h1>Client Configuration</h1>
        </div>
        <div className="inputs">
          {/* Client ID */}
          <div className="field-row">
            <label>Client ID</label>
            <div className="field-value">{clientId || 'Loading...'}</div>
          </div>
          {/* Client Secret */}
          <div className="field-row secret-key">
            <label>Secret Key</label>
            <div className="field-value">{clientSecret || 'Loading...'}</div>
          </div>
          {/* Init URL */}
          <div className="inline-input-box">
            <label
              htmlFor="initUrl"
              className={`inline-label ${fieldErrors.initUrl ? 'error-label' : ''}`}
            >
              Init URL *
            </label>
            <input
              type="text"
              id="initUrl"
              autoComplete="off"
              className={`inline-input ${fieldErrors.initUrl ? 'error' : ''}`}
              placeholder="https://client-config.yourdomain.com/init"
              value={initUrl}
              onChange={handleInitUrlChange}
            />
            {fieldErrors.initUrl && <p className="error-message">{fieldErrors.initUrl}</p>}
          </div>
          {/* Callback Host */}
          <div className="inline-input-box">
            <label
              htmlFor="callbackHost"
              className={`inline-label ${fieldErrors.callbackHost ? 'error-label' : ''}`}
            >
              Callback Host *
            </label>
            <input
              type="text"
              id="callbackHost"
              autoComplete="off"
              className={`inline-input ${fieldErrors.callbackHost ? 'error' : ''}`}
              placeholder="https://yourapp.com/callback"
              value={callbackHost}
              onChange={handleCallbackHostChange}
            />
            {fieldErrors.callbackHost && (
              <p className="error-message">{fieldErrors.callbackHost}</p>
            )}
          </div>
          <div className="button-row">
            <a
              href="/metadata.json"
              download="metadata.json"
              onClick={() => handleDownloadClick(DownloadType.METADATA)}
            >
              <button type="button" className="icon-button">
                <img src={downloadIcon} className="download-icon" alt="Download" loading="lazy" />
                Meta Data
              </button>
            </a>
            <a
              href="/JWK.json"
              download="JWK.json"
              onClick={() => handleDownloadClick(DownloadType.JWK)}
            >
              <button type="button" className="icon-button">
                <img src={downloadIcon} className="download-icon" alt="Download" loading="lazy" />
                JWK
              </button>
            </a>
          </div>
          {/* Radio Buttons */}
          <div className="radio-section">
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="openOption"
                  value={OpenMode.IFRAME}
                  checked={openOption === OpenMode.IFRAME}
                  onChange={() => setOpenOption(OpenMode.IFRAME)}
                />
                <span>Open in iframe</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="openOption"
                  value={OpenMode.NEWTAB}
                  checked={openOption === OpenMode.NEWTAB}
                  onChange={() => setOpenOption(OpenMode.NEWTAB)}
                />
                <span>Open in new tab</span>
              </label>
            </div>
            {fieldErrors.openOption && <p className="error-message">{fieldErrors.openOption}</p>}
          </div>
          {/* iframe Fields */}
          {openOption === OpenMode.IFRAME && (
            <>
              {/* Unique ID */}
              <div className="inline-input-box">
                <label
                  htmlFor="uniqueId"
                  className={`inline-label ${fieldErrors.uniqueId ? 'error-label' : ''}`}
                >
                  Unique ID *
                </label>
                <input
                  type="text"
                  id="uniqueId"
                  autoComplete="off"
                  className={`inline-input ${fieldErrors.uniqueId ? 'error' : ''}`}
                  value={uniqueId}
                  onChange={handleUniqueIdChange}
                  placeholder="e.g., 001"
                />
                {fieldErrors.uniqueId && <p className="error-message">{fieldErrors.uniqueId}</p>}
              </div>
              <div className="inline-input-box">
                <label
                  htmlFor="displayWidth"
                  className={`inline-label ${fieldErrors.displayWidth ? 'error-label' : ''}`}
                >
                  Display Width (%) *
                </label>
                <input
                  type="text"
                  id="displayWidth"
                  autoComplete="off"
                  className={`inline-input ${fieldErrors.displayWidth ? 'error' : ''}`}
                  value={displayWidth}
                  onChange={handleDisplayWidthChange}
                  placeholder="e.g., 100,80,20"
                />
                {fieldErrors.displayWidth && (
                  <p className="error-message">{fieldErrors.displayWidth}</p>
                )}
              </div>
              <div className="permissions">
                <p>Permissions</p>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.enableCamera}
                    onChange={(e) =>
                      setPermissions((prev) => ({
                        ...prev,
                        enableCamera: e.target.checked,
                      }))
                    }
                  />
                  Enable Camera for this iframe
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.enableMic}
                    onChange={(e) =>
                      setPermissions((prev) => ({
                        ...prev,
                        enableMic: e.target.checked,
                      }))
                    }
                  />
                  Enable Microphone for this iframe
                </label>
              </div>
            </>
          )}
          <button className="submit-btn" onClick={handleSubmit} disabled={!isFormValid()}>
            Submit
          </button>
        </div>
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

export default HomePage;
