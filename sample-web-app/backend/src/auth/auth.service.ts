import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { AuthCodeData, AccessTokenData, UserClaims, ClientSession } from './types/auth.types';
import { SSOConfig } from '../types/config.types';
import loadConfig from '../config/loadConfig';

@Injectable()
export class AuthService implements OnApplicationShutdown {
  // In-memory stores
  private readonly authCode: Record<string, AuthCodeData> = {};
  private readonly accessToken: Record<string, AccessTokenData> = {};

  // Config properties
  private readonly config: SSOConfig = loadConfig;
  private readonly privateKey: string = this.config.private_key;
  private readonly alg: jwt.Algorithm = this.config.alg as jwt.Algorithm;
  private readonly kid: string = this.config.idTokenRsaKey;

  // Interval reference
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Run cleanup every minute (60000 ms)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredAuthCode();
      this.cleanupExpiredAccessToken();
    }, 60 * 1000).unref();
  }

  // Lifecycle hook: called on app shutdown
  onApplicationShutdown(signal?: string) {
    clearInterval(this.cleanupInterval);
  }

  /**
   * Validate client credentials (client_id and optionally client_secret) from the session
   * If only client_id is provided, validates only client_id
   * If both client_id and client_secret are provided, validates both
   */
  validateClientFromSession(
    session: ClientSession | null,
    client_id: string,
    client_secret?: string,
  ): boolean {
    if (!session?.clientCredentials) return false;
    const stored = session.clientCredentials;
    // Always check client_id
    if (stored.client_id !== client_id) return false;
    // If client_secret is provided, check that too
    if (client_secret && stored.client_secret !== client_secret) return false;
    return true;
  }

  /**
   * Generate a random alphanumeric string
   * @param length Length of the string to generate
   * @returns Random URL-safe alphanumeric string
   */
  private buildRandomString(length: number): string {
    // Allowed URL-safe characters (A–Z, a–z, 0–9)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    // Generate cryptographically secure random bytes
    const bytes = randomBytes(length);
    // Map each random byte to a character in the allowed set
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    // Return the final code
    return result;
  }

  /**
   * Generate a 9-character authorization code
   * @returns Random authorization code
   */
  private buildAuthCode(): string {
    return this.buildRandomString(9);
  }

  /**
   * Generate a new authorization code with 5-minute expiry
   * @param payload Object containing client_id, redirect_uri, response_type, and scope
   * @returns Newly generated authorization code
   */
  generateAuthCode(payload: Omit<AuthCodeData, 'created_at' | 'expiresAt'>): string {
    const code = this.buildAuthCode();
    // Expiration from SSO config, default to 5 minutes if not set
    // Note: auth_code_expires_in is in seconds, convert to milliseconds for timestamps
    const expiresInSec = this.config.auth_code_expires_in ?? 5 * 60;
    const expiresAt = Date.now() + expiresInSec * 1000;
    this.authCode[code] = { ...payload, created_at: Date.now(), expiresAt };
    return code;
  }

  /**
   * Validate authorization code
   * Single-use: code is removed after successful validation
   * @param code Authorization code to validate
   * @returns Associated AuthCodeData if valid; otherwise null
   */
  validateAuthCode(code: string): AuthCodeData | null {
    const data = this.authCode[code];
    if (!data) return null;
    if (Date.now() > data.expiresAt) {
      // Remove expired code
      delete this.authCode[code];
      return null;
    }
    // Remove code after successful validation (single-use)
    delete this.authCode[code];
    return data;
  }

  /**
   * Generate a 28-character access token
   * @returns Random access token
   */
  private buildAccessToken(): string {
    return this.buildRandomString(28);
  }

  /**
   * Generate a new access token with a 5-minute expiry
   * @param payload The payload containing client_id
   * @returns A newly generated random access token string
   */
  generateAccessToken(payload: { client_id: string }): AccessTokenData {
    const token = this.buildAccessToken();
    // Expiration from SSO config, default to 5 minutes if not set
    // Note: access_token_expires_in is in seconds, convert to milliseconds for timestamps
    const expiresInSec = this.config.access_token_expires_in ?? 5 * 60;
    const expiresAt = Date.now() + expiresInSec * 1000;
    const tokenData: AccessTokenData = {
      access_token: token,
      client_id: payload.client_id,
      created_at: Date.now(),
      expiresAt,
    };
    this.accessToken[token] = tokenData;
    return tokenData;
  }

  /**
   * Generate JWT ID Token
   * @param user Object containing user info
   * @returns Signed JWT string
   */
  generateIdToken(user: UserClaims): string {
    const now = Math.floor(Date.now() / 1000); // JWT uses seconds
    const expiresInSec = this.config.id_token_expires_in ?? 5 * 60; // expiration in seconds
    const exp = now + expiresInSec; // exp must be in seconds
    const payload = {
      ...user,
      iat: now, // issued at in seconds
      exp, // expires at in seconds
    };
    return jwt.sign(payload, this.privateKey, {
      algorithm: this.alg,
      header: {
        alg: this.alg,
        kid: this.kid,
      },
    });
  }

  /**
   * Remove expired authorization code from the in-memory store
   * Helps in preventing memory leaks
   */
  private cleanupExpiredAuthCode(): void {
    const now = Date.now();
    for (const code of Object.keys(this.authCode)) {
      if (this.authCode[code].expiresAt <= now) {
        delete this.authCode[code];
      }
    }
  }

  /**
   * Remove expired access token from the in-memory store
   * Helps in preventing memory leaks
   */
  private cleanupExpiredAccessToken(): void {
    const now = Date.now();
    for (const token of Object.keys(this.accessToken)) {
      if (this.accessToken[token].expiresAt <= now) {
        delete this.accessToken[token];
      }
    }
  }

  /**
   * This function is not used in controller - not in scope
   * Validate access token
   * Can be used multiple times until expiry
   * @param token Access token to validate
   * @returns Associated AccessTokenData if valid; otherwise null
   */
  validateAccessToken(token: string): AccessTokenData | null {
    const data = this.accessToken[token];
    if (!data) return null;
    if (Date.now() > data.expiresAt) {
      // Remove expired access token
      delete this.accessToken[token];
      return null;
    }
    return data;
  }
}
