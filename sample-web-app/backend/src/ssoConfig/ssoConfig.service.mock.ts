import { SSOConfig } from './types/ssoConfig.types';

export const mockSsoConfig: SSOConfig = {
  issuer: 'http://localhost',
  authorization_endpoint: 'http://localhost:9000/api/auth/authorize',
  token_endpoint: 'http://localhost:9000/api/auth/token',
  response_type: ['code'],
  scopes: ['openid'],
  auth_code_expires_in: 300,
  alg: 'RS256',
  idTokenRsaKey: 'idTokenRsaKey',
  private_key: 'MOCK_PRIVATE_KEY',
  access_token_expires_in: 300,
  id_token_expires_in: 300,
  support_refresh_token: false,
};

export const SsoConfigServiceMock = {
  getConfig: () => mockSsoConfig,
  getPrivateKey: () => mockSsoConfig.private_key,
  getIssuerUrl: () => mockSsoConfig.issuer,
  getAuthorizationEndpoint: () => mockSsoConfig.authorization_endpoint,
  getTokenEndpoint: () => mockSsoConfig.token_endpoint,
};
