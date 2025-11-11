import {
  Post,
  Query,
  Req,
  Res,
  Body,
  Controller,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import loadConfig from '../config/loadConfig';
import { SSOConfig } from '../types/config.types';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthorizeDto } from './dto/authorize.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Config properties
  private readonly config: SSOConfig = loadConfig;

  /**
   * Handle authorization requests to generate an authorization code
   * Validates client from session, then creates a one-time auth code
   * @param req Express request object containing session info
   * @param query Query parameters including client_id, response_type, scope, redirect_uri, and optional state
   * @param res Express response object used to send redirect URL or JSON
   * @returns JSON object containing the redirect URL with appended auth code and state (for API/testing purposes)
   * @throws BadRequestException if the client_id is invalid or client is not authenticated
   */
  @Post('authorize')
  authorize(@Req() req: Request, @Query() query: AuthorizeDto, @Res() res: Response): Response {
    const { client_id, response_type, scope, redirect_uri, state } = query;
    // Validate client from session
    if (!this.authService.validateClientFromSession(req.session ?? null, client_id)) {
      throw new BadRequestException('Invalid client_id or client not authenticated');
    }
    // Generate a one-time authorization code for valid client request
    const authCode = this.authService.generateAuthCode({
      client_id,
      redirect_uri,
      response_type,
      scope,
    });
    // Build redirect URL with auth code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', authCode);
    // Append state if provided
    if (state) redirectUrl.searchParams.append('state', state);
    // Uncomment below for real OAuth2 flow to redirect user
    // if (response_type === 'code') {
    //   return res.redirect(redirectUrl.toString());
    // }
    // For testing/API response: return redirect URL JSON
    return res.json({ redirectUrl: redirectUrl.toString() });
  }

  /**
   * Exchange authorization code for access token
   * @param body Body containing code
   * @param res Express response object to return access token
   * @returns JSON object containing access_token, token_type, id_token, and expires_in
   * @throws BadRequestException if auth code is invalid or expired
   * @throws UnauthorizedException if Authorization header or client credentials are invalid
   */
  @Post('token')
  token(@Body() body: { code: string }, @Req() req: Request, @Res() res: Response): Response {
    const { code } = body || {};
    // Check for authorization code in request body
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }
    // Validate Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    // Decode "Basic base64(client_id:client_secret)"
    const base64Credentials = authHeader.split(' ')[1];
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [client_id, client_secret] = decoded.split(':');
    if (!client_id || !client_secret) {
      throw new UnauthorizedException('Invalid Authorization header credentials');
    }
    // Validate client credentials (client_id + client_secret) from session
    if (!this.authService.validateClientFromSession(req.session, client_id, client_secret)) {
      throw new UnauthorizedException('Invalid Authorization header credentials');
    }
    // Validate authorization code
    const authData = this.authService.validateAuthCode(code);
    if (!authData || authData.client_id !== client_id) {
      throw new BadRequestException('Invalid or expired authorization code');
    }
    // Generate access token
    const accessTokenData = this.authService.generateAccessToken({ client_id });
    // Generate ID token
    const id_token: string = this.authService.generateIdToken({
      iss: 'https://www.digitalinsight.com',
      sub: 'user-id-123',
      aud: client_id,
      email: 'john.doe@example.com',
      given_name: 'John',
      family_name: 'Deo',
      birthday: '1970-01-01',
      preferred_username: 'john_deo_19700101',
      phone_number: '+0000000000',
    });
    // Return OAuth2-compliant response with 5-min expiry
    return res.json({
      id_token,
      token_type: 'Bearer',
      expires_in: this.config.access_token_expires_in ?? this.config.id_token_expires_in ?? 300,
      // 5 minutes
      access_token: accessTokenData.access_token,
    });
  }
}
