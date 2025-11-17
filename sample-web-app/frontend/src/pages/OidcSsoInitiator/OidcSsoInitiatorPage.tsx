import React, { FC, useState } from 'react';
import './OidcSsoInitiatorPage.css';
import { useAppSelector } from '../../app/hooks';

export const TargetOptions = {
  NEW_TAB: '_blank',
  IFRAME: 'OIDC_iFrame',
};

const OidcSsoInitiatorPage: FC = () => {
  const { openOption, iframeSettings, initUrl } = useAppSelector((state: any) => state.home);
  const [showIframe, setShowIframe] = useState(false);

  const handleClick = () => {
    // Show iframe only when link is clicked
    setShowIframe(true);
  };

  return (
    <>
      <div className="auto-reload-message">
        This page will automatically reload after 5 minutes, as the client_id and client_secret
        expire and are regenerated every 5 minutes.
      </div>
      <div className="sign-url">
        <h3>Sign in Securely</h3>
        <a
          href={initUrl}
          target={openOption === 'newTab' ? TargetOptions.NEW_TAB : TargetOptions.IFRAME}
          rel="noopener noreferrer"
          onClick={handleClick}
        >
          Start OIDC SSO
        </a>
        {iframeSettings && showIframe && (
          <iframe
            name={TargetOptions.IFRAME}
            title="OIDC SSO Frame"
            style={{
              width: `${iframeSettings.displayWidth}%`,
              height: '500px',
              border: '1px solid #ccc',
              marginTop: '20px',
            }}
          />
        )}
      </div>
    </>
  );
};

export default OidcSsoInitiatorPage;
