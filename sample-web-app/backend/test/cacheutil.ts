import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const REPO_CACHE_JSON_RELATIVE_PATH = '../../cache.json';
const ZIP_CACHE_JSON_RELATIVE_PATH = '../../../cache.json';

export interface AppConfig {
  initUrl?: string;
  callbackHost?: string;
}

/**
 * Reads callbackHost from a given cache.json file
 * and validates its structure.
 */
function loadCallbackHost(configFilePath: string): string {
  let config: AppConfig;
  try {
    const rawContent = readFileSync(configFilePath, 'utf-8');
    config = JSON.parse(rawContent);
  } catch (error) {
    throw new Error(
      `Failed to read or parse config file at ${configFilePath}: ${(error as Error).message}`
    );
  }
  if (typeof config.callbackHost !== 'string') {
    throw new Error(`"callbackHost" is missing or invalid in ${configFilePath}`);
  }
  return config.callbackHost;
}

/**
 * Resolves callbackHost across different runtime layouts:
 * - repository / build layout
 * - packaged ZIP (final deliverable) layout
 */
export function readCallbackHost(): string {
  const repoCacheJsonPath = resolve(__dirname, REPO_CACHE_JSON_RELATIVE_PATH);
  const zipCacheJsonPath = resolve(__dirname, ZIP_CACHE_JSON_RELATIVE_PATH);
  if (existsSync(repoCacheJsonPath)) {
    return loadCallbackHost(repoCacheJsonPath);
  }
  if (existsSync(zipCacheJsonPath)) {
    return loadCallbackHost(zipCacheJsonPath);
  }
  throw new Error(
    `cache.json not found in expected locations:\n` +
    `- ${repoCacheJsonPath}\n` +
    `- ${zipCacheJsonPath}`
  );
}
