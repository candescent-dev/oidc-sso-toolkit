import { Inject, Injectable } from '@nestjs/common';
import type { ClientCredentials } from './types/client.types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';

@Injectable()
export class ClientService {
  private readonly CLIENT_CREDENTIALS_CACHE_KEY = 'client_credentials';
  private readonly AUTH_SETTING_CACHE_KEY = 'auth_setting';
  private readonly TTL_MS = 15 * 60 * 1000; // 15 minutes

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Generate a new client ID and secret with creation timestamp.
   * @returns An object containing client_id, client_secret, and created_at timestamp.
   */
  async generateClientCredentials(): Promise<ClientCredentials> {
    // Clear old credentials from cache
    await this.cacheManager.del(this.CLIENT_CREDENTIALS_CACHE_KEY);
    // Clear auth setting from cache
    await this.cacheManager.del(this.AUTH_SETTING_CACHE_KEY);
    const credentials: ClientCredentials = {
      client_id: this.generateClientId(),
      client_secret: this.generateSecret(),
      created_at: new Date().toISOString(),
    };
    // Store in cache with TTL in miliseconds
    await this.cacheManager.set(this.CLIENT_CREDENTIALS_CACHE_KEY, credentials, this.TTL_MS);
    return credentials;
  }

  /**
   * Retrieve cached client credentials, or undefined if expired.
   */
  async getCredentialsFromCache(): Promise<ClientCredentials | undefined> {
    return await this.cacheManager.get<ClientCredentials>(this.CLIENT_CREDENTIALS_CACHE_KEY);
  }

  /**
   * Generate a random client ID (public identifier).
   * Uses 16 bytes → 22 characters base64url-encoded.
   */
  private generateClientId(): string {
    return randomBytes(16)
      .toString('base64')
      .replace(/\+/g, 'A')
      .replace(/\//g, 'B')
      .replace(/=+$/, '');
  }

  /**
   * Generate a cryptographically secure random client secret.
   * Uses 32 bytes → 43 characters base64url-encoded (256-bit entropy).
   */
  private generateSecret(): string {
    return randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
