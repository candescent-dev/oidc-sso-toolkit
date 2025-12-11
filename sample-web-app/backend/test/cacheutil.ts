import * as fs from 'fs';
import * as path from 'path';

const APP_CONFIG_PATH = '../../cache.json';

export interface AppConfig {
  initUrl?: string;
  callbackHost?: string;
}

/**
 * Safely read JSON config and return callbackHost.
 * Throws a clear error if file/path/JSON/key is missing.
 */
export function readCallbackHost(): string {
  // Resolve relative to this file, not the working directory
  const resolvedPath = path.resolve(__dirname, APP_CONFIG_PATH);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Config file not found at: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  let json: AppConfig;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${resolvedPath}: ${(e as Error).message}`);
  }

  if (!json.callbackHost || typeof json.callbackHost !== 'string') {
    throw new Error(
      `Missing or invalid "callbackHost" in config: ${resolvedPath}`
    );
  }

  return json.callbackHost;
}