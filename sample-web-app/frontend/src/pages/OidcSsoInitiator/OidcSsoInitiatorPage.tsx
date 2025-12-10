import React, { FC, useState } from 'react';
import { OpenMode } from '../../features/home/types';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { saveAuthSetting } from '../../features/OidcSsoInitiator/OidcSsoInitiatorSlice';
import './OidcSsoInitiatorPage.css';

export const TargetOptions = {
  NEW_TAB: '_blank',
  IFRAME: 'OIDC_iFrame',
} as const;

const AUTO_RELOAD_MESSAGE =
  'This page will automatically reload after 15 minutes, as the client_id and client_secret expire and are regenerated every 15 minutes.';

const IFRAME_HEIGHT = '500px';
const IFRAME_BORDER = '1px solid #ccc';
const IFRAME_MARGIN_TOP = '20px';

const OidcSsoInitiatorPage: FC = () => {
  const dispatch = useAppDispatch();
  const { openOption, iframeSettings, initUrl, callbackHost } = useAppSelector(
    (state) => state.home
  );
  const [showIframe, setShowIframe] = useState(false);

  const handleLinkClick = () => {
    setShowIframe(true);
    dispatch(saveAuthSetting({ initUrl, callbackHost }));
  };

  const targetValue = openOption === OpenMode.NEWTAB ? TargetOptions.NEW_TAB : TargetOptions.IFRAME;

  const iframeStyle = iframeSettings
    ? {
        width: `${iframeSettings.displayWidth}%`,
        height: IFRAME_HEIGHT,
        border: IFRAME_BORDER,
        marginTop: IFRAME_MARGIN_TOP,
      }
    : undefined;

  const iframeAllow = iframeSettings
    ? Object.entries(iframeSettings.permissions)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .join('; ')
    : '';

  return (
    <>
      <div className="auto-reload-message">{AUTO_RELOAD_MESSAGE}</div>
      <div className="sign-url">
        <h3>Sign in Securely</h3>
        <a href={initUrl} target={targetValue} rel="noopener noreferrer" onClick={handleLinkClick}>
          Start OIDC SSO
        </a>
        {iframeSettings && showIframe && (
          <iframe
            name={TargetOptions.IFRAME}
            title="OIDC SSO Frame"
            id={iframeSettings.uniqueId}
            allow={iframeAllow}
            style={iframeStyle}
          />
        )}
      </div>
    </>
  );
};

export default OidcSsoInitiatorPage;
