import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SsoConfigService } from '../ssoConfig/ssoConfig.service';
import { SsoConfigServiceMock } from '../ssoConfig/ssoConfig.service.mock';

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
