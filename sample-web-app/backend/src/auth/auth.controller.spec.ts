import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SsoConfigService } from '../ssoConfig/ssoConfig.service';
import { SsoConfigServiceMock } from '../ssoConfig/ssoConfig.service.mock';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
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

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
