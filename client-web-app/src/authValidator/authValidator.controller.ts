import { Controller, Get, Query, Res } from '@nestjs/common';
import { AuthValidatorService } from './authValidator.service';
import { AuthorizeDto } from './dto/authorize.dto';
import type { Response } from 'express';

@Controller('auth-validator')
export class AuthValidatorController {
  constructor(private readonly authValidatorService: AuthValidatorService) {}

  /**
   * Endpoint to validate "/authorize" endpoint.
   * @param query Query parameters including client_id, response_type, scope, redirect_uri, and optional state
   * @param res Express response object used to send redirect URL or JSON
   * @returns JSON object containing the redirect URL with appended auth code and state (for API/testing purposes)
   * @throws BadRequestException if the client_id is invalid
   */
  @Get('validate-authorize')
  async authorize(@Query() query: AuthorizeDto, @Res() res: Response): Promise<Response> {
    try {
      // Call service to get redirectUrl from external API
      const result = await this.authValidatorService.authorizeClient(query);
      // Return JSON with redirectUrl on success
      return res.json({ redirectUrl: result.redirectUrl });
    } catch (error) {
      // Return error object
      return res.status(400).json(error);
    }
  }
}
