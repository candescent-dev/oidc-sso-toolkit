import { Test, TestingModule } from '@nestjs/testing';
import { AuthValidatorService } from './authValidator.service';
import { HttpService } from '@nestjs/axios';

describe('AuthValidatorService', () => {
  let service: AuthValidatorService;

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthValidatorService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();
    service = module.get<AuthValidatorService>(AuthValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
