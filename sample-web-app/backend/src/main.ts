import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { APP_CONFIG } from './appConfig/appConfig.provider';

const FRONTEND_CONFIG_PATH = '../../../frontend/public/api.config.json';

async function bootstrap() {
  // Create a new NestJS application instance
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get<{ backendPort: number }>(APP_CONFIG);
  const port = appConfig.backendPort;

  // Update frontend/public/config.json dynamically
  const frontendConfig = {
    apiBaseURL: `http://localhost:${port}/api`,
  };
  const frontendConfigPath = path.resolve(__dirname, FRONTEND_CONFIG_PATH);
  try {
    fs.writeFileSync(frontendConfigPath, JSON.stringify(frontendConfig, null, 2));
    console.log(`Updated frontend config.json with baseURL: ${frontendConfig.apiBaseURL}`);
  } catch (err: any) {
    console.warn('Could not update frontend config.json:', err.message);
  }

  // Enable custom CORS options
  app.enableCors({
    origin: ['http://localhost:8000'], // allowed origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // allowed HTTP methods
    credentials: true, // allow cookies to be sent
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api'); // makes all routes start with /api

  // Enable global validation for incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not defined in DTOs
      forbidNonWhitelisted: true, // throw error if unknown properties are sent
    }),
  );

  // Start the application on dynamic port (default port - 9000)
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port}`);
}
bootstrap();
