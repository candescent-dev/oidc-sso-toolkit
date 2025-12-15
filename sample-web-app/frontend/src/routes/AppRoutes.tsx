import React, { FC, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { ROUTES } from '../constants/AppRoutes';
// Eagerly loaded Header Component
import Header from '../components/Header/Header';
// Lazy-loaded pages
const HomePage = lazy(() => import('../pages/Home/HomePage'));
const OidcSsoInitiatorPage = lazy(() => import('../pages/OidcSsoInitiator/OidcSsoInitiatorPage'));
const OidcValidatorPage = lazy(() => import('../pages/OidcValidator/OidcValidatorPage'));
const PageNotFound = lazy(() => import('../pages/PageNotFound/PageNotFoundPage')); //  404 Page Not Found

// Fallback skeleton while page loads
const PageLoader: FC = () => <div className="loader">Loading Page......</div>;

const RoutesWithExpiry: FC = () => {
  const navigate = useNavigate();
  // Get the credential issuedAt from Redux
  const credentialsIssuedAt = useAppSelector((state) => state.home.credentialsIssuedAt);

  // Start expiry timer here
  useEffect(() => {
    if (!credentialsIssuedAt) return; // Credentials not fetched yet
    const EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes
    const remainingTime = EXPIRY_TIME - (Date.now() - credentialsIssuedAt);
    if (remainingTime <= 0) {
      // Already expired → navigate home immediately
      sessionStorage.removeItem('credentialsIssuedAt');
      navigate(ROUTES.HOME, { replace: true });
      return;
    }
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem('credentialsIssuedAt');
      navigate(ROUTES.HOME, { replace: true });
    }, remainingTime);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.START_OIDC_SSO} element={<OidcSsoInitiatorPage />} />
        <Route path={ROUTES.OIDC_VALIDATOR} element={<OidcValidatorPage />} />
        {/* 404 route */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

const AppRoutes: FC = () => (
  <Router>
    {/* Global Header */}
    <Header />
    {/* Lazy-loaded pages */}
    <RoutesWithExpiry />
  </Router>
);

export default AppRoutes;
