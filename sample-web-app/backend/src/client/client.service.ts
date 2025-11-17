import { Inject, Injectable } from '@nestjs/common';
import type { ClientCredentials } from './types/client.types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';

@Injectable()
export class ClientService {
  private readonly CACHE_KEY = 'client_credentials';
  private readonly TTL_SECONDS = 300_000; // 5 minutes

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Generate a new client ID and secret with creation timestamp.
   * @returns An object containing client_id, client_secret, and created_at timestamp.
   */
  public async generateClientCredentials(): Promise<ClientCredentials> {
    const credentials: ClientCredentials = {
      client_id: this.generateClientId(),
      client_secret: this.generateSecret(),
      created_at: new Date().toISOString(),
    };
    // Store in cache with TTL in seconds
    await this.cacheManager.set(this.CACHE_KEY, credentials, this.TTL_SECONDS);
    return credentials;
  }

  /**
   * Retrieve cached credentials, or undefined if expired.
   */
  public async getCredentialsFromCache(): Promise<ClientCredentials | undefined> {
    return await this.cacheManager.get<ClientCredentials>(this.CACHE_KEY);
  }

  // public async getCredentialsFromCache() {
  //   const obj = await this.cacheManager.get<object>(this.CACHE_KEY);
  //   return obj;
  // }

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
