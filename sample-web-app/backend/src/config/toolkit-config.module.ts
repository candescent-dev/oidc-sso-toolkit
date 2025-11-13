import { Module } from '@nestjs/common';
import { ToolkitConfigProvider } from './toolkit-config.provider';

@Module({
  providers: [ToolkitConfigProvider],
  exports: [ToolkitConfigProvider],
})
export class ToolkitConfigModule {}
