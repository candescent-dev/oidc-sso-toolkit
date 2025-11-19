import React, { FC, useState, useMemo } from 'react';
import './OidcSsoInitiatorPage.css';
import { useAppSelector } from '../../app/hooks';
import { OpenMode } from '../../features/home/types';

/* ============================================
   Constants
   ============================================ */
export const TargetOptions = {
  NEW_TAB: '_blank',
  IFRAME: 'OIDC_iFrame',
} as const;

const AUTO_RELOAD_MESSAGE =
  'This page will automatically reload after 5 minutes, as the client_id and client_secret expire and are regenerated every 5 minutes.';

const IFRAME_HEIGHT = '500px';
const IFRAME_BORDER = '1px solid #ccc';
const IFRAME_MARGIN_TOP = '20px';

/* ============================================
   Component
   ============================================ */
const OidcSsoInitiatorPage: FC = () => {
  const { openOption, iframeSettings, initUrl } = useAppSelector((state) => state.home);
  const [showIframe, setShowIframe] = useState(false);

  const targetValue = useMemo(() => {
    return openOption === OpenMode.NEWTAB ? TargetOptions.NEW_TAB : TargetOptions.IFRAME;
  }, [openOption]);

  const handleLinkClick = () => {
    setShowIframe(true);
  };

  const iframeStyle = useMemo(() => {
    if (!iframeSettings) return null;
    return {
      width: `${iframeSettings.displayWidth}%`,
      height: IFRAME_HEIGHT,
      border: IFRAME_BORDER,
      marginTop: IFRAME_MARGIN_TOP,
    };
  }, [iframeSettings]);

  const iframeAllow = useMemo(() => {
    if (!iframeSettings) return '';
    const permissions: string[] = [];
    if (iframeSettings.permissions.enableCamera) {
      permissions.push('camera');
    }
    if (iframeSettings.permissions.enableMic) {
      permissions.push('microphone');
    }
    return permissions.join('; ');
  }, [iframeSettings]);

  const shouldShowIframe = iframeSettings && showIframe;

  return (
    <>
      <div className="auto-reload-message">{AUTO_RELOAD_MESSAGE}</div>
      <div className="sign-url">
        <h3>Sign in Securely</h3>
        <a
          href={initUrl}
          target={targetValue}
          rel="noopener noreferrer"
          onClick={handleLinkClick}
        >
          Start OIDC SSO
        </a>
        {shouldShowIframe && (
          <iframe
            name={TargetOptions.IFRAME}
            title="OIDC SSO Frame"
            id={iframeSettings.uniqueId}
            allow={iframeAllow}
            style={iframeStyle || undefined}
          />
        )}
      </div>
    </>
  );
};

export default OidcSsoInitiatorPage;
