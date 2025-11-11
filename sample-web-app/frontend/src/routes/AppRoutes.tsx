import React, { FC } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '../pages/Home/HomePage';
import OidcSsoInitiatorPage from '../pages/OidcSsoInitiator/OidcSsoInitiatorPage';

// === Route Paths Constants (type-safe) ===
const ROUTES = {
  HOME: '/',
  START_OIDC_SSO: '/startOidcSso',
} as const;

// Type for route paths
type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

const AppRoutes: FC = () => (
  <Router>
    <Routes>
      {/* Home Page Route */}
      <Route path={ROUTES.HOME} element={<HomePage />} />
      {/* OIDC SSO Initiator Page Route */}
      <Route path={ROUTES.START_OIDC_SSO} element={<OidcSsoInitiatorPage />} />
    </Routes>
  </Router>
);

export default AppRoutes;
