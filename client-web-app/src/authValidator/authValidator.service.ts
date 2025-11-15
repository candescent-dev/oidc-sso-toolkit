import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AuthorizeDto } from './dto/authorize.dto';

@Injectable()
export class AuthValidatorService {
  constructor(private readonly httpService: HttpService) {}

  // private sessionCookie?: string;
  // private extractSessionCookie(headers?: Record<string, any>): string | undefined {
  //   if (!headers) return undefined;
  //   const raw = headers['set-cookie'];
  //   if (!raw) return undefined;
  //   return Array.isArray(raw) ? raw[0] : raw;
  // }

  // /**
  //  * Fetches session cookie & credentials from external API.
  //  * Stores ONLY the session cookie.
  //  */
  // async fetchClientCredentials(): Promise<void> {
  //   try {
  //     const response: AxiosResponse<any> = await firstValueFrom(
  //       this.httpService
  //         .get('http://localhost:9000/api/client', {
  //           withCredentials: true,
  //         })
  //         .pipe(
  //           catchError((error) => {
  //             if (error.response?.data) {
  //               throw error.response.data;
  //             } else {
  //               throw { message: error.message || 'External API request failed' };
  //             }
  //           }),
  //         ),
  //     );
  //     // Extract session cookie
  //     const sessionCookie = this.extractSessionCookie(response?.headers);
  //     if (sessionCookie) this.sessionCookie = sessionCookie;
  //     if (!response.data?.credentials) {
  //       throw {
  //         message:
  //           'External API did not return any session, no credentials found in session or session expired',
  //       };
  //     }
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  /**
   * Calls external authorization API with query parameters.
   * @param Object containing client_id, response_type, scope, redirect_uri, state
   * @returns Response from external API containing redirect URL
   * @throws Throws error if API call fails or response is invalid
   */
  async authorizeClient(dto: AuthorizeDto): Promise<{ redirectUrl: string }> {
    try {
      // await this.fetchClientCredentials();
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService
          .get('http://localhost:9000/api/auth/authorize', {
            params: dto,
            // headers: {
            //   Cookie: this.sessionCookie,
            // },
            // withCredentials: true,
          })
          .pipe(
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
