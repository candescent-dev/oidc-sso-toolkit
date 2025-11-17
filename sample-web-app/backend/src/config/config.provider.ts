import * as fs from 'fs';
import * as path from 'path';
import { Provider } from '@nestjs/common';

export const CONFIG = 'CONFIG';
const CONFIG_PATH = '../../../../config.json';

export const ConfigProvider: Provider = {
  provide: CONFIG,
  useFactory: () => {
    const configPath = path.resolve(__dirname, CONFIG_PATH);
    let config = { backendPort: 9000 }; // default
    try {
      const rawData = fs.readFileSync(configPath, 'utf-8');
      const json = JSON.parse(rawData);
      config.backendPort = json.backendPort ?? config.backendPort;
    } catch (err) {
      console.warn(
        `config.json not found at: ${configPath}. Falling back to default port ${config.backendPort}`,
      );
    }
    return config;
  },
};
