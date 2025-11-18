import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AuthorizeDto } from './dto/authorize.dto';
import { TokenResponse } from 'src/types/authValidator.types';

export interface ServiceSuccess<T> {
  success: true;
  data: T;
}
export interface ServiceError {
  success: false;
  error: any;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

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
  /** Call external authorize API */
  async authorizeClient(dto: AuthorizeDto): Promise<ServiceResult<{ redirectUrl: string }>> {
    const response = await firstValueFrom(
      this.httpService
        .get<{ redirectUrl: string }>(this.AUTHORIZE_ENDPOINT_URL, { params: dto })
        .pipe(
          catchError((error) =>
            of({
              success: false,
              error: error.response?.data ?? error.message,
            } as ServiceError),
          ),
        ),
    );
    if ((response as ServiceError).success === false) {
      return response as ServiceError;
    }
    const axiosResponse = response as AxiosResponse<{ redirectUrl: string }>;
    return {
      success: true,
      data: axiosResponse.data,
    };
  }

  /**
   * Exchanges authorization code for token
   * @param client_id Client ID
   * @param client_secret Client Secret
   * @param code Authorization code
   */
  async exchangeToken(
    client_id: string,
    client_secret: string,
    code: string,
  ): Promise<ServiceResult<TokenResponse>> {
    const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    const response = await firstValueFrom(
      this.httpService
        .post<TokenResponse>(
          this.TOKEN_ENDPOINT_URL,
          { code },
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/json',
            },
          },
        )
        .pipe(
          catchError((error) =>
            of({
              success: false,
              error: error.response?.data ?? error.message,
            } as ServiceError),
          ),
        ),
    );
    if ((response as ServiceError).success === false) {
      return response as ServiceError;
    }
    const axiosResponse = response as AxiosResponse<TokenResponse>;
    return {
      success: true,
      data: axiosResponse.data,
    };
  }
}
