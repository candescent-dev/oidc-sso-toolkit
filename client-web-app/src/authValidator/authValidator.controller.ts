import { Controller, Get } from '@nestjs/common';
import { AuthValidatorService } from './authValidator.service';
import { AuthValidatorConfig, AuthorizePayload, TokenResponse } from '../types/authValidator.types';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

/** Return type: either TokenResponse on success, or raw external API error */
type AuthorizeAndTokenResult = TokenResponse | Record<string, unknown>;
const issuer = 'https://www.digitalinsight.com';

@Controller('auth-validator')
export class AuthValidatorController {
  private readonly configPath = path.resolve('src/authValidatorConfig/config.json');
  private config: AuthValidatorConfig;
  private tokenApiResponse: TokenResponse | null = null;

  constructor(private readonly authValidatorService: AuthValidatorService) {}

  /** Load config from file */
  private loadAuthValidatorConfig(): AuthValidatorConfig {
    if (!this.config) {
      if (!fs.existsSync(this.configPath)) {
        throw new Error('AuthValidatorConfig file not found');
      }
      const file = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(file) as AuthValidatorConfig;
    }
    return this.config;
  }

  /** Save config to file */
  private saveAuthValidatorConfig(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
  }
  /** Combined endpoint: calls authorize and then exchangeToken */
  @Get('call-authorize-and-token')
  async authorizeAndExchangeToken(): Promise<AuthorizeAndTokenResult> {
    try {
      const config = this.loadAuthValidatorConfig();
      // Build authorize payload
      const payload: AuthorizePayload = {
        client_id: config.client_id,
        redirect_uri: config.redirect_uri,
        response_type: 'code',
        scope: 'openid',
      };
      if (config.state) {
        payload.state = config.state;
      }
      //  Call authorize Api
      const authorizeResult = await this.authValidatorService.authorizeClient(payload);
      if (!authorizeResult.success) {
        return authorizeResult.error;
      }
      const redirectUrl = authorizeResult.data.redirectUrl;
      // Extract auth code
      const parsedUrl = new url.URL(redirectUrl);
      const authCode = parsedUrl.searchParams.get('code');
      if (!authCode) {
        return { message: '"/authorize" - Missing authorization code in redirectUrl' };
      }
      // Update config file
      config.redirectUrl = redirectUrl;
      this.saveAuthValidatorConfig();
      // Call token Api
      const tokenResult = await this.authValidatorService.exchangeToken(
        config.client_id,
        config.client_secret,
        authCode,
      );
      if (!tokenResult.success) {
        return tokenResult.error;
      }
      // Store token response for later use
      this.tokenApiResponse = tokenResult.data;
      // Return token response
      return tokenResult.data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { message: err.message };
      }
      return { error: err };
    }
  }

  /** Endpoint to validate stored id_token */
  @Get('validate-id-token')
  async validateLastIdToken() {
    if (!this.tokenApiResponse?.id_token) {
      return {
        isValid: false,
        error: 'id_token not found. Call "/call-authorize-and-token" endpoint first',
      };
    }
    const config = this.loadAuthValidatorConfig();
    try {
      const payload = await this.authValidatorService.validateIdToken(
        this.tokenApiResponse.id_token,
        issuer,
        config.client_id,
      );
      return { isValid: true, payload };
    } catch (err: any) {
      return { isValid: false, error: err.message };
    }
  }
}
