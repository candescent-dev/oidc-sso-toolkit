import * as fs from 'fs';
import * as path from 'path';

const APP_CONFIG_PATH = '../../cache.json';
const DOCKER_CONFIG_PATH = '../../../cache.json';

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
  const resolvedAppPath = path.resolve(__dirname, APP_CONFIG_PATH);
  const resolvedDockerPath = path.resolve(__dirname, DOCKER_CONFIG_PATH);

  if (fs.existsSync(resolvedAppPath)) {
    const raw = fs.readFileSync(resolvedAppPath, 'utf-8');
    let json: AppConfig;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Invalid JSON in ${resolvedAppPath}: ${(e as Error).message}`);
    }
    if (!json.callbackHost || typeof json.callbackHost !== 'string') {
      throw new Error(`Missing or invalid "callbackHost" in config: ${resolvedAppPath}`);
    }
    return json.callbackHost;
  } else {
    console.log("Cache in Docker ******")
    const raw = fs.readFileSync(resolvedDockerPath, 'utf-8');
    let json: AppConfig;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Invalid JSON in ${resolvedDockerPath}: ${(e as Error).message}`);
    }
    if (!json.callbackHost || typeof json.callbackHost !== 'string') {
      throw new Error(`Missing or invalid "callbackHost" in config: ${resolvedDockerPath}`);
    }
    return json.callbackHost;
  }
}