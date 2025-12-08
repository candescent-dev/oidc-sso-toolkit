import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { APP_CONFIG } from './appConfig/appConfig.provider';

const FRONTEND_PUBLIC_CONFIG_PATH = '../../../frontend/public/api.config.json';
const FRONTEND_BUILD_CONFIG_PATH = '../../../frontend/api.config.json';

async function bootstrap() {
  // Create a new NestJS application instance
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get<{ backendPort: number; frontendPort: number }>(APP_CONFIG);
  const { backendPort, frontendPort } = appConfig;

  // Update frontend config both (local + build)
  const frontendConfig = {
    frontendPort,
    apiBaseURL: `http://localhost:${backendPort}/api`,
  };

  [FRONTEND_PUBLIC_CONFIG_PATH, FRONTEND_BUILD_CONFIG_PATH].forEach((relPath) => {
    const filePath = resolve(__dirname, relPath);
    try {
      writeFileSync(filePath, JSON.stringify(frontendConfig, null, 2));
      console.log(`Updated ${filePath} with config:`, frontendConfig);
    } catch (err: any) {
      console.warn(`Could not update ${filePath}:`, err.message);
    }
  });

  // Enable custom CORS options
  app.enableCors({
    origin: true, // allow all origins dynamically
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
  await app.listen(backendPort);
  console.log(`Server listening on http://localhost:${backendPort}`);
}
bootstrap();
