import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SsoConfigService } from '../ssoConfig/ssoConfig.service';
import { SsoConfigServiceMock } from '../ssoConfig/ssoConfig.service.mock';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SsoConfigService,
          useValue: SsoConfigServiceMock,
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          }, // simple mock for cache manager
        },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    // Stop interval to avoid Jest open handle warnings
    service.onApplicationShutdown();
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
