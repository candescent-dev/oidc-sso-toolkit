import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClientModule } from './client/client.module';
import { ToolkitConfigModule } from './config/toolkit-config.module';
@Module({
  imports: [ToolkitConfigModule, ClientModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
