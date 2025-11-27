import { SSOConfig } from './types/ssoConfig.types';
import * as fs from 'fs';
import * as path from 'path';

const PRIVATE_KEY_PATH = '../../certs/private.pem';

// Read the private key from a file
const privateKeyPath = path.resolve(__dirname, PRIVATE_KEY_PATH);
if (!fs.existsSync(privateKeyPath))
  throw new Error(`Private key file not found at: ${privateKeyPath}`);
const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

export const mockSsoConfig: SSOConfig = {
  issuer: 'http://localhost',
  authorization_endpoint: 'http://localhost:9000/api/auth/authorize',
  token_endpoint: 'http://localhost:9000/api/auth/token',
  response_type: ['code'],
  scopes: ['openid'],
  auth_code_expires_in: 300,
  alg: 'RS256',
  idTokenRsaKey: 'idTokenRsaKey',
  private_key: privateKey,
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
