import * as fs from 'fs';
import * as path from 'path';
import { SSOConfig } from '../types/config.types';

// Resolve the absolute path to the SSO config JSON file
const configPath = path.resolve(__dirname, 'sso-config.json');
// Read the raw contents of the config file as a string
const rawData = fs.readFileSync(configPath, 'utf8');
// Parse the JSON string into a strongly-typed SSOConfig object
const loadConfig: SSOConfig = JSON.parse(rawData);

// Read the private key (.pem) file
const privateKeyPath = path.resolve(process.cwd(), 'certs/private.pem');
if (fs.existsSync(privateKeyPath)) {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  // Inject private key into the config object
  (loadConfig as any).private_key = privateKey;
} else {
  console.warn('Private key file not found at:', privateKeyPath);
}

// Dynamically build endpoints using port
loadConfig.issuer = `${loadConfig.issuer}:${loadConfig.port}`;
loadConfig.authorization_endpoint = `${loadConfig.issuer}/api/auth/authorize`;
loadConfig.token_endpoint = `${loadConfig.issuer}/api/auth/token`;

export default loadConfig;
