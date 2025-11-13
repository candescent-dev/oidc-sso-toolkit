import * as fs from 'fs';
import * as path from 'path';
import session from 'express-session';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import chokidar from 'chokidar';

// Helper to read config dynamically
function getConfig() {
  const data = fs.readFileSync(path.join(__dirname, 'config', 'sso-config.json'), 'utf8');
  return JSON.parse(data);
}

// Helper to create NestJS app instance
async function createApp(port: number) {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:8000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Session setup
  app.use(
    session({
      secret: 'my-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 5 * 60 * 1000 },
    }),
  );

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Start server
  await app.listen(port);
  console.log(`🚀 Server listening on http://localhost:${port}`);
  return app;
}

async function bootstrap() {
  let config = getConfig();
  let port = config.port;
  let app = await createApp(port);

  // Watch sso-config.json for changes
  const configPath = path.join(__dirname, 'config', 'sso-config.json');
  const watcher = chokidar.watch(configPath, { ignoreInitial: true });

  watcher.on('change', async () => {
    try {
      const newConfig = getConfig();
      console.log('♻️ sso-config.json changed:', newConfig);

      // Update frontend config dynamically
      const frontendConfig = { baseURL: `http://localhost:${newConfig.port}` };
      const projectRoot = path.resolve(__dirname, '../../../');
      const frontendConfigPath = path.join(projectRoot, 'frontend', 'public', 'config.json');
      fs.writeFileSync(frontendConfigPath, JSON.stringify(frontendConfig, null, 2));
      console.log('Updated frontend config.json with backendBaseUrl:', frontendConfig.baseURL);

      // If port changed, restart server
      if (newConfig.port !== port) {
        console.log(`♻️ Port changed from ${port} to ${newConfig.port}. Restarting server...`);
        port = newConfig.port;
        await app.close(); // close old listener
        app = await createApp(port); // start new listener
      }

      // Update in-memory config for other values if needed
      config = newConfig;
    } catch (err) {
      console.error('Failed to reload sso-config.json:', err.message);
    }
  });
}

bootstrap();
