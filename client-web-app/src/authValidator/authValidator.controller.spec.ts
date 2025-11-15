import { Test, TestingModule } from '@nestjs/testing';
import { AuthValidatorController } from './authValidator.controller';

describe('AuthValidatorController', () => {
  let controller: AuthValidatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthValidatorController],
    }).compile();

    controller = module.get<AuthValidatorController>(AuthValidatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
