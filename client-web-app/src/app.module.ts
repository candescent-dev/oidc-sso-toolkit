import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthValidatorModule } from './authValidator/authValidator.module';

@Module({
  imports: [AuthValidatorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
