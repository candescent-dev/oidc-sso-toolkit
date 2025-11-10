import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { ClientCredentials } from './types/client.types';

@Injectable()
export class ClientService {
  /**
   * Generate a new client ID and secret with creation timestamp.
   * @returns An object containing client_id, client_secret, and created_at timestamp.
   */
  generateClientCredentials(): ClientCredentials {
    return {
      client_id: this.generateClientId(),
      client_secret: this.generateSecret(),
      created_at: new Date().toISOString(),
    };
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
