import { Controller, Post, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ClientService } from './client.service';
import type { ClientCredentials } from './types/client.types';

@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  /**
   * POST /client — Generate new client credentials and store them in session.
   * @param req Express request object, used to access session.
   * @returns The newly generated client credentials including client_id, client_secret, and created_at.
   */
  @Post()
  createClient(@Req() req: Request): ClientCredentials {
    // Generate a new set of client credentials (clientId & clientSecret)
    const credentials = this.clientService.generateClientCredentials();
    // Store generated credentials in the session for subsequent validation
    req.session.clientCredentials = credentials;
    return credentials;
  }

  /**
   * GET /client — Retrieve stored client credentials from session.
   * Note: This endpoint is intended for internal or server-side use, not exposed to frontend.
   * @param req Express request object, used to access session.
   * @returns The stored client credentials or an informative message if none found.
   */
  @Get()
  getClientCredentials(@Req() req: Request) {
    // Retrieve credentials from the session
    const credentials = req.session.clientCredentials;
    // If no credentials exist in session, return a message indicating session expiration or absence
    if (!credentials) {
      return { message: 'No credentials found in session or session expired.' };
    }
    // Return the stored credentials with a success message
    return {
      message: 'Credentials retrieved from session.',
      credentials,
    };
  }
}
