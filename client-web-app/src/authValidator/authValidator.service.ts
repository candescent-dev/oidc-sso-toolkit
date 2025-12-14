import { resolve } from 'path';
import { randomBytes } from 'crypto';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { existsSync, readFileSync } from 'fs';
import { AuthorizeDto } from './dto/authorize.dto';
import { firstValueFrom, catchError, of } from 'rxjs';
import { jwtVerify, importJWK, JWTPayload } from 'jose';
import { TokenResponse } from 'src/types/authValidator.types';
import { JWKKeys, AuthValidatorConfig } from '../types/authValidator.types';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

export interface ServiceSuccess<T> {
  success: true;
  data: T;
}
export interface ServiceError {
  success: false;
  error: any;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

@Injectable()
export class AuthValidatorService {
  private readonly JWK: JWKKeys;
  private readonly AUTHORIZE_ENDPOINT_URL: string;
  private readonly TOKEN_ENDPOINT_URL: string;
  private readonly config: AuthValidatorConfig;

  private static readonly CONFIG_PATH = resolve('src/authValidatorConfig/config.json');
  private static readonly JWK_PATH = resolve('src/authValidatorConfig/JWK.json');

  constructor(private readonly httpService: HttpService) {
    this.config = this.loadJsonFile<AuthValidatorConfig>(
      AuthValidatorService.CONFIG_PATH,
      'AuthValidatorConfig',
    );
    this.JWK = this.loadJsonFile<JWKKeys>(AuthValidatorService.JWK_PATH, 'JWK');
    const { backendPort } = this.config;
    if (!backendPort) {
      throw new InternalServerErrorException(
        'backendPort not found in src/authValidatorConfig/config.json',
      );
    }
    this.AUTHORIZE_ENDPOINT_URL = `http://localhost:${backendPort}/api/auth/authorize`;
    this.TOKEN_ENDPOINT_URL = `http://localhost:${backendPort}/api/auth/token`;
  }

  private loadJsonFile<T>(filePath: string, name: string): T {
    if (!existsSync(filePath)) {
      throw new InternalServerErrorException(`${name} file not found: ${filePath}`);
    }
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as T;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to parse ${name} file: ${filePath}`);
    }
  }

  /**
   * Generates a short, cryptographically-secure random string for OAuth2 state
   * This string is URL-safe and suitable for OAuth2/OIDC `state` parameters
   * It protects against CSRF and authorization-code injection attacks
   * @param length - The length of the state string to generate (default: 6)
   * @returns A randomly generated alphanumeric string, e.g. "jt4ozs"
   */
  generateState(length = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    // Generate secure random bytes
    const bytes = randomBytes(length);
    // Convert bytes to characters
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  /**
   * Calls external authorization API with query parameters
   * @param Object containing client_id, response_type, scope, redirect_uri, state
   * @returns Response from external API containing redirect URL
   * @throws Throws error if API call fails or response is invalid
   */
  /** Call external authorize API */
  async authorizeClient(dto: AuthorizeDto): Promise<ServiceResult<{ redirectUrl: string }>> {
    const response = await firstValueFrom(
      this.httpService
        .get<{ redirectUrl: string }>(this.AUTHORIZE_ENDPOINT_URL, { params: dto })
        .pipe(
          catchError((error) =>
            of({
              success: false,
              error: error.response?.data ?? error.message,
            } as ServiceError),
          ),
        ),
    );
    if ((response as ServiceError).success === false) {
      return response as ServiceError;
    }
    const axiosResponse = response as AxiosResponse<{ redirectUrl: string }>;
    return {
      success: true,
      data: axiosResponse.data,
    };
  }

  /**
   * Exchanges authorization code for token
   * @param client_id Client ID
   * @param client_secret Client Secret
   * @param code Authorization code
   */
  async exchangeToken(
    client_id: string,
    client_secret: string,
    code: string,
  ): Promise<ServiceResult<TokenResponse>> {
    const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    const response = await firstValueFrom(
      this.httpService
        .post<TokenResponse>(
          this.TOKEN_ENDPOINT_URL,
          { code },
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/json',
            },
          },
        )
        .pipe(
          catchError((error) =>
            of({
              success: false,
              error: error.response?.data ?? error.message,
            } as ServiceError),
          ),
        ),
    );
    if ((response as ServiceError).success === false) {
      return response as ServiceError;
    }
    const axiosResponse = response as AxiosResponse<TokenResponse>;
    return {
      success: true,
      data: axiosResponse.data,
    };
  }

  /** Validate ID token signature + iss + aud */
  async validateIdToken(idToken: string, issuer: string, audience: string): Promise<JWTPayload> {
    const publicKey = await importJWK(this.JWK, 'RS256');
    const { payload } = await jwtVerify(idToken, publicKey, {
      issuer,
      audience,
    });
    return payload;
  }
}
