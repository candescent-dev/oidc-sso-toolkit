import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { AuthValidatorService } from './authValidator.service';
import { AuthValidatorConfig, AuthorizePayload } from '../types/authValidator.types';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('auth-validator')
export class AuthValidatorController {
  private readonly configPath = path.resolve('src/authValidatorConfig/config.json');

  constructor(private readonly authValidatorService: AuthValidatorService) {}

  /**
   * Endpoint to validate "/authorize" endpoint using JSON config.
   * @param query Optional query parameter 'state'
   * @param res Express response object used to send redirect URL or JSON
   */
  @Get('call-authorize')
  async authorize(@Res() res: Response): Promise<Response> {
    try {
      // Check if config file exists
      if (!fs.existsSync(this.configPath)) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'AuthValidatorConfig file not found' });
      }
      // Read and parse config file
      const configFile = fs.readFileSync(this.configPath, 'utf-8');
      const config: AuthValidatorConfig = JSON.parse(configFile);
      // Build payload to send to service
      const payload: AuthorizePayload = {
        client_id: config.client_id,
        redirect_uri: config.redirect_uri,
        response_type: 'code',
        scope: 'openid',
      };
      // Add state only if present in config
      if (config.state) {
        payload.state = config.state;
      }
      // Call service
      const result = await this.authValidatorService.authorizeClient(payload);
      // Return JSON with redirect URL
      return res.status(HttpStatus.OK).json({ redirectUrl: result.redirectUrl });
    } catch (error) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: error.message || 'Authorization failed' });
    }
  }
}
