import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SsoConfigService } from '../ssoConfig/ssoConfig.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ERROR_CODE } from './errors/auth.errors';
import { InternalServerErrorException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let ssoConfigService: SsoConfigService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateClientFromCache: jest.fn().mockResolvedValue(true),
            generateAuthCode: jest.fn().mockReturnValue('auth-code-123'),
          },
        },
        {
          provide: SsoConfigService,
          useValue: {
            getConfig: jest.fn().mockReturnValue({
              access_token_expires_in: 900,
              id_token_expires_in: 900,
            }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    ssoConfigService = module.get<SsoConfigService>(SsoConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('authorize - AUTH_CODE_GENERATION_FAILED', () => {
    it('should throw InternalServerErrorException when generateAuthCode returns null', async () => {
      console.log('Test 1: Testing null return value');

      // Mock generateAuthCode to return null (not string 'null')
      jest.spyOn(authService, 'generateAuthCode').mockReturnValue(null as any);
      console.log('Mock set: generateAuthCode returns null');

      const query = {
        client_id: 'test-client',
        response_type: 'code',
        scope: 'openid profile',
        redirect_uri: 'https://example.com/callback',
      };

      console.log('Calling controller.authorize with query:', query);

      try {
        await controller.authorize(query as any);
        console.log('ERROR: No exception was thrown!');
        fail('Expected InternalServerErrorException to be thrown');
      } catch (error: any) {
        console.log('Exception caught:', error.status, error.message);
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect(error.message).toBe(ERROR_CODE.AUTH_CODE_GENERATION_FAILED);
      }
    });

    it('should throw InternalServerErrorException when generateAuthCode returns undefined', async () => {
      console.log('Test 2: Testing undefined return value');

      // Mock generateAuthCode to return undefined
      jest.spyOn(authService, 'generateAuthCode').mockReturnValue(undefined as any);
      console.log('Mock set: generateAuthCode returns undefined');

      const query = {
        client_id: 'test-client',
        response_type: 'code',
        scope: 'openid profile',
        redirect_uri: 'https://example.com/callback',
      };

      console.log('Calling controller.authorize with query:', query);

      try {
        await controller.authorize(query as any);
        console.log('ERROR: No exception was thrown!');
        fail('Expected InternalServerErrorException to be thrown');
      } catch (error: any) {
        console.log('Exception caught:', error.status, error.message);
        expect(error).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });
});
