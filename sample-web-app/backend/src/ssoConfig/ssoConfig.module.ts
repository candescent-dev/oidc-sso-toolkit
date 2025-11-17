import { Module } from '@nestjs/common';
import { AppConfigModule } from '../appConfig/appConfig.module';
import { SsoConfigService } from './ssoConfig.service';

@Module({
  imports: [AppConfigModule],
  providers: [SsoConfigService],
  exports: [SsoConfigService],
})
export class SsoConfigModule {}
