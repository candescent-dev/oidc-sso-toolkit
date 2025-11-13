import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SsoConfigModule } from '../ssoConfig/ssoConfig.module';

@Module({
  imports: [SsoConfigModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
