import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AuthorizeDto } from './dto/authorize.dto';

@Injectable()
export class AuthValidatorService {
  private readonly AUTHORIZE_ENDPOINT_URL = 'http://localhost:9000/api/auth/authorize';
  private readonly TOKEN_ENDPOINT_URL = 'http://localhost:9000/api/auth/token';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Calls external authorization API with query parameters.
   * @param Object containing client_id, response_type, scope, redirect_uri, state
   * @returns Response from external API containing redirect URL
   * @throws Throws error if API call fails or response is invalid
   */
  async authorizeClient(dto: AuthorizeDto): Promise<{ redirectUrl: string }> {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(this.AUTHORIZE_ENDPOINT_URL, { params: dto }).pipe(
          catchError((error) => {
            if (error.response?.data) {
              throw error.response.data;
            } else {
              throw { message: error.message || 'External API request failed' };
            }
          }),
        ),
      );
      if (!response.data?.redirectUrl) {
        throw { message: 'External API did not return redirectUrl' };
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
