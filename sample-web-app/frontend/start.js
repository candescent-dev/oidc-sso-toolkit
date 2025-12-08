import { readFileSync } from 'fs';
import { spawn } from 'child_process';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve path to api.config.json
const configPath = path.resolve(__dirname, 'api.config.json');

// Default config (used if api.config.json is missing)
let config = {
  frontendPort: 8000, // default port
};

try {
  const raw = readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  // Merge parsed values into default config
  config = { ...config, ...parsed };
} catch (err) {
  console.warn(
    `Warning: Could not read api.config.json. Using default port ${config.frontendPort}.`
  );
}

// Determine port from config
const port = config.frontendPort;

// Start React dev server using spawn
const child = spawn('react-scripts', ['start'], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'inherit', // logs show up in terminal
});

// Handle exit of the dev server
child.on('exit', (code) => {
  process.exit(code ?? 0); // propagate exit code
});

child.on('error', (err) => {
  console.error('Failed to start React dev server:', err);
  process.exit(1);
});
