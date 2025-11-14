import React, { FC, useState } from "react";
import { Link } from "@mui/material";
import "./OidcSsoInitiatorPage.css";
import { useAppSelector } from '../../app/hooks';


const OidcSsoInitiatorPage: FC = () => {
  const { openOption, iframeSettings, initUrl } = useAppSelector((state: any) => state.session);
   const [showIframe, setShowIframe] = useState(false);

  const handleClick = () => {
    // Show iframe only when link is clicked
    setShowIframe(true);
  };
  console.log(iframeSettings,'iframeSettingsiframeSettings');
  return (
    <main className="oidc-sso-initiator-page">
      <div>
        <h3>Sign in Securely</h3>
        <Link
          href={initUrl}
          underline="always"
          color="primary"
          target={openOption === 'newTab' ? '_blank' : 'OIDC_iFrame'}
          rel="noopener noreferrer"
          onClick={handleClick}
        >
          Start OIDC SSO
        </Link>
        {(iframeSettings && showIframe) &&<iframe
          name="OIDC_iFrame"
          title="OIDC SSO Frame"
          style={{ width: "100%", height: "500px", border: "1px solid #ccc", marginTop: "20px" }}
        ></iframe>}
      </div>
    </main>
  );
};

export default OidcSsoInitiatorPage;
