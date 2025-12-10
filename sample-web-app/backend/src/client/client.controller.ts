import { Controller, Post, Get, Req } from '@nestjs/common';
import { ClientService } from './client.service';
import type { ClientCredentials } from './types/client.types';

@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  /**
   * POST /client — Generate new client credentials and store them in cache
   * @returns The newly generated client credentials including client_id, client_secret, and created_at
   */
  @Post()
  public async createClient(): Promise<ClientCredentials> {
    // Generate a new set of client credentials and store them in cache
    const credentials = await this.clientService.generateClientCredentials();
    return credentials;
  }

  /**
   * GET /client — Retrieve cached client credentials
   * @returns The cached credentials or a message if none exist or expired
   */
  @Get()
  public async getClientCredentials(): Promise<{
    message: string;
    credentials?: ClientCredentials;
  }> {
    const credentials = await this.clientService.getCredentialsFromCache();
    if (!credentials) {
      return { message: 'No credentials found or credentials expired' };
    }
    return {
      message: 'Credentials retrieved from cache',
      credentials,
    };
  }
}
