import { Module } from '@nestjs/common';
import { ToolkitConfigModule } from '../config/toolkit-config.module';
import { SsoConfigService } from './ssoConfig.service';

@Module({
  imports: [ToolkitConfigModule],
  providers: [SsoConfigService],
  exports: [SsoConfigService],
})
export class SsoConfigModule {}
