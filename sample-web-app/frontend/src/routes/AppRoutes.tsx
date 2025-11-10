import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import HomePage from "../pages/Home/HomePage";
import OidcSsoInitiatorPage from "../pages/OidcSsoInitiator/OidcSsoInitiatorPage";

const AppRoutes: React.FC = () => (
  <Router>
    <Routes>
      {/* Home Page Route */}
      <Route path="/" element={<HomePage />} />
      {/* OIDC SSO Initiator Page Route */}
      <Route path="/startOidcSso" element={<OidcSsoInitiatorPage />} />
    </Routes>
  </Router>
);

export default AppRoutes;
