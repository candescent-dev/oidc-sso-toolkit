import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create a new NestJS application instance
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api'); // makes all routes start with /api

  // Enable global validation for incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not defined in DTOs
      forbidNonWhitelisted: true, // throw error if unknown properties are sent
    }),
  );

  // Start the application on port - default 7080, can be overridden via PORT env variable
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7080;
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port}`);
}
bootstrap();
