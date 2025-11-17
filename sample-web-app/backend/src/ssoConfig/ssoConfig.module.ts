import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { SsoConfigService } from './ssoConfig.service';

@Module({
  imports: [ConfigModule],
  providers: [SsoConfigService],
  exports: [SsoConfigService],
})
export class SsoConfigModule {}
