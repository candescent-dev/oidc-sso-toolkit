import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Inject } from '@nestjs/common';
import { SSOConfig } from './types/ssoConfig.types';
import { APP_CONFIG } from '../appConfig/appConfig.provider';

const SSO_CONFIG_PATH = './sso-config.json';
const PRIVATE_KEY_PATH = '../../certs/private.pem';

@Injectable()
export class SsoConfigService {
  private readonly ssoConfig: SSOConfig;

  constructor(@Inject(APP_CONFIG) private readonly config: { backendPort: number }) {
    // Load SSO config
    const ssoConfigPath = path.resolve(__dirname, SSO_CONFIG_PATH);
    if (!fs.existsSync(ssoConfigPath)) throw new Error(`Missing SSO config at ${ssoConfigPath}`);
    const loadConfig: SSOConfig = JSON.parse(fs.readFileSync(ssoConfigPath, 'utf-8'));
    // Load private key if exists
    const privateKeyPath = path.resolve(__dirname, PRIVATE_KEY_PATH);
    if (!fs.existsSync(privateKeyPath))
      throw new Error(`Private key file not found at: ${privateKeyPath}`);
    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    // Build URLs using the backend port from config
    const issuerUrl = `${loadConfig.issuer}:${this.config.backendPort}`;
    this.ssoConfig = {
      ...loadConfig,
      private_key: privateKey,
      issuer: issuerUrl,
      authorization_endpoint: `${issuerUrl}/api/auth/authorize`,
      token_endpoint: `${issuerUrl}/api/auth/token`,
    };
  }

  getConfig(): SSOConfig {
    return this.ssoConfig;
  }

  getPrivateKey(): string {
    return this.ssoConfig.private_key;
  }

  getIssuerUrl(): string {
    return this.ssoConfig.issuer;
  }

  getAuthorizationEndpoint(): string {
    return this.ssoConfig.authorization_endpoint;
  }

  getTokenEndpoint(): string {
    return this.ssoConfig.token_endpoint;
  }
}
