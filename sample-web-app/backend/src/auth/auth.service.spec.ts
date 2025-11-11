import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    // clean up the interval
    service.onApplicationShutdown();
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
