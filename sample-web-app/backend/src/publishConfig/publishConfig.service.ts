import * as fs from 'fs';
import * as path from 'path';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppConfig } from './types/publishConfig.types';
import { AuthSettingData } from '../auth/types/authSetting.types';
import {
  Inject,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

const APP_CONFIG_PATH = '../../../../config.json';

@Injectable()
export class PublishConfigService {
  private readonly appConfigPath = path.resolve(__dirname, APP_CONFIG_PATH);
  private readonly AUTH_SETTING_CACHE_KEY = 'auth_setting';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Reads and returns the OIDC config.json file
   * @returns Buffer containing the contents of config.json(frontendPort & backendPort), initUrl & callbackHost
   * @throws NotFoundException if the config.json file is missing
   * @throws InternalServerErrorException if the config.json file is not readable or incomplete
   */
  async getConfigFile(): Promise<Buffer> {
    if (!fs.existsSync(this.appConfigPath)) {
      throw new NotFoundException(`config.json not found at: ${this.appConfigPath}`);
    }
    // Read config.json file
    const rawConfigBuffer = fs.readFileSync(this.appConfigPath);
    let appConfig: AppConfig;
    try {
      appConfig = JSON.parse(rawConfigBuffer.toString()) as AppConfig;
    } catch (err) {
      throw new InternalServerErrorException('Failed to parse config.json');
    }
    // Throw error if ports missing
    if (!appConfig.frontendPort) {
      throw new InternalServerErrorException('frontendPort is missing in config.json');
    }
    if (!appConfig.backendPort) {
      throw new InternalServerErrorException('backendPort is missing in config.json');
    }
    // Retrieve cache
    const authSettings = await this.getAuthSettingFromCache();
    // Throw error if no cache or missing fields
    if (!authSettings || !authSettings.initUrl || !authSettings.callbackHost) {
      throw new InternalServerErrorException(
        'Missing initUrl or callbackHost',
      );
    }
    // Assign cached values
    appConfig.initUrl = authSettings.initUrl;
    appConfig.callbackHost = authSettings.callbackHost;
    const appConfigBuffer = Buffer.from(JSON.stringify(appConfig, null, 2));
    return appConfigBuffer;
  }

  /**
   * Retrieve cached auth setting, or undefined if expired.
   */
  async getAuthSettingFromCache(): Promise<AuthSettingData | undefined> {
    return await this.cacheManager.get<AuthSettingData>(this.AUTH_SETTING_CACHE_KEY);
  }
}
