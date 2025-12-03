import React, { FC, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Eagerly loaded Header Component
import Header from '../components/Header/Header';
// Lazy-loaded pages
const HomePage = lazy(() => import('../pages/Home/HomePage'));
const OidcSsoInitiatorPage = lazy(() => import('../pages/OidcSsoInitiator/OidcSsoInitiatorPage'));
const OidcValidatorPage = lazy(() => import('../pages/OidcValidator/OidcValidatorPage'));

// Route paths (type-safe)
const ROUTES = {
  HOME: '/',
  START_OIDC_SSO: '/startOidcSso',
  OIDC_VALIDATOR: '/oidcValidator',
} as const;

// Fallback skeleton while page loads
const PageLoader: FC = () => <div className="loader">Loading Page......</div>;

const AppRoutes: FC = () => (
  <Router>
    {/* Global Header */}
    <Header />
    {/* Lazy-loaded pages */}
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.START_OIDC_SSO} element={<OidcSsoInitiatorPage />} />
        <Route path={ROUTES.OIDC_VALIDATOR} element={<OidcValidatorPage />} />
      </Routes>
    </Suspense>
  </Router>
);

export default AppRoutes;
