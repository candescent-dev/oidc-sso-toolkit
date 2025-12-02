import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClientModule } from './client/client.module';
import { AppConfigModule } from './appConfig/appConfig.module';
import { PublishConfigModule } from './publishConfig/publishConfig.module';
@Module({
  imports: [
    AppConfigModule,
    ClientModule,
    AuthModule,
    PublishConfigModule,
    CacheModule.register({
      // default TTL ignored; per-item TTL used instead
      ttl: 0,
      // Make cache available globally across all modules
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
