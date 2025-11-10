import React, { FC } from 'react';
import { useDispatch } from 'react-redux';

const OidcSsoInitiatorPage: FC = () => {
  const dispatch = useDispatch();
  
  return (
    <main className="oidc-sso-initiator-page">
      <h1>Start OIDC SSO</h1>
    </main>
  );
};

export default OidcSsoInitiatorPage;
