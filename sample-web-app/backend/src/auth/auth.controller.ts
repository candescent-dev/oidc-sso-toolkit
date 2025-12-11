import {
  Get,
  Post,
  Query,
  Req,
  Res,
  Body,
  Controller,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SsoConfigService } from '../ssoConfig/ssoConfig.service';
import { SSOConfig } from '../ssoConfig/types/ssoConfig.types';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthorizeDto } from './dto/authorize.dto';
import { AuthSettingDto } from './dto/authSetting.dto';
import { ERROR_CODE } from './errors/auth.errors';
import { AuthSettingData } from './types/authSetting.types';

@Controller('auth')
export class AuthController {
  // SSO Config properties
  private readonly ssoConfig: SSOConfig;

  constructor(
    private readonly authService: AuthService,
    private readonly ssoConfigService: SsoConfigService,
  ) {
    this.ssoConfig = this.ssoConfigService.getConfig();
  }

  /**
   * Handle authorization requests to generate an authorization code
   * Validates client from cache, then creates a one-time auth code
   * @param query Query parameters including client_id, response_type, scope, redirect_uri, and optional state
   * @param res Express response object used to send redirect URL or JSON
   * @returns JSON object containing the redirect URL with appended auth code and state (for API/testing purposes)
   * @throws BadRequestException if the client_id is invalid or client is not authenticated
   */
  @Get('authorize')
  async authorize(@Query() query: AuthorizeDto): Promise<{ redirectUrl: string }> {
    const { client_id, response_type, scope, redirect_uri, state } = query;
    if (!client_id || !redirect_uri || !response_type) {
      throw new BadRequestException(ERROR_CODE.MISSING_REQUIRED_PARAMS);
    }
    // Validate client from cache
    const isValidClient = await this.authService.validateClientFromCache(client_id);
    if (!isValidClient) {
      throw new BadRequestException(ERROR_CODE.INVALID_CLIENT);
    }
    // Generate a one-time authorization code for valid client request
    const authCode = this.authService.generateAuthCode({
      client_id,
      redirect_uri,
      response_type,
      scope,
    });
    if (!authCode) {
      throw new InternalServerErrorException(ERROR_CODE.AUTH_CODE_GENERATION_FAILED);
    }
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
    return { redirectUrl: redirectUrl.toString() };
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
  async token(
    @Body() body: { code: string },
    @Req() req: Request,
  ): Promise<{
    id_token: string;
    token_type: string;
    expires_in: number;
    access_token: string;
  }> {
    const { code } = body || {};
    // Check for authorization code in request body
    if (!code) {
      throw new BadRequestException(ERROR_CODE.AUTH_CODE_MISSING);
    }
    // Validate Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException(ERROR_CODE.REQUEST_HEADER_MISSING_AUTHORIZATION);
    }
    // Decode "Basic base64(client_id:client_secret)"
    const base64Credentials = authHeader.split(' ')[1];
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [client_id, client_secret] = decoded.split(':');
    if (!client_id || !client_secret) {
      throw new UnauthorizedException(ERROR_CODE.AUTH_CREDENTIALS_MISSING);
    }
    // Validate client credentials (client_id + client_secret) from cache
    const isValidClient = await this.authService.validateClientFromCache(client_id, client_secret);
    if (!isValidClient) {
      throw new UnauthorizedException(ERROR_CODE.AUTH_CREDENTIALS_MISSING);
    }
    // Validate authorization code
    const authData = this.authService.validateAuthCode(code);
    if (!authData || authData.client_id !== client_id) {
      throw new BadRequestException(ERROR_CODE.INVALID_EXPIRE_AUTH_CODE);
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
    return {
      id_token,
      token_type: 'Bearer',
      expires_in:
        this.ssoConfig.access_token_expires_in ?? this.ssoConfig.id_token_expires_in ?? 900,
      access_token: accessTokenData.access_token,
    };
  }

  /**
   * Stores Init Url & Callback Host in cache
   * @param body DTO containing initUrl and callbackHost
   * @returns A success message if settings are stored successfully
   */
  @Post('auth-setting')
  async authSetting(@Body() body: AuthSettingDto, @Res() res: Response) {
    const { initUrl, callbackHost } = body;
    try {
      await this.authService.saveAuthSetting(initUrl, callbackHost);
      return res.status(200).json({ message: 'Auth settings stored successfully' });
    } catch (error: any) {
      const status = error?.status || 500;
      const message = error?.message || 'Something went wrong. Please try again later';
      return res.status(status).json({ message });
    }
  }

  /**
   * GET /auth/auth-setting — Retrieve auth setting from cache.json file
   * @returns The cached auth setting or a message if none exist or expired
   */
  @Get('auth-setting')
  public async getAuthSetting(): Promise<{
    message: string;
    authSetting?: AuthSettingData;
  }> {
    const authSetting = await this.authService.getAuthSettingFromCache();
    if (!authSetting) {
      return { message: 'No auth setting found or they have expired' };
    }
    return {
      message: 'Auth setting retrieved from cache',
      authSetting,
    };
  }
}
