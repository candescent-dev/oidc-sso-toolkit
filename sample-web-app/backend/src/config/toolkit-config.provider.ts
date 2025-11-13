import * as fs from 'fs';
import * as path from 'path';
import { Provider } from '@nestjs/common';

export const TOOLKIT_CONFIG = 'TOOLKIT_CONFIG';
const TOOLKIT_CONFIG_PATH = '../../../../../toolkit-config/config.json';

export const ToolkitConfigProvider: Provider = {
  provide: TOOLKIT_CONFIG,
  useFactory: () => {
    const toolkitConfigPath = path.resolve(__dirname, TOOLKIT_CONFIG_PATH);
    let toolkitConfig = { backendPort: 9000 }; // default
    try {
      const rawData = fs.readFileSync(toolkitConfigPath, 'utf-8');
      const json = JSON.parse(rawData);
      toolkitConfig.backendPort = json.backendPort ?? toolkitConfig.backendPort;
    } catch (err) {
      console.warn(
        `config.json not found at: ${toolkitConfigPath}. Falling back to default port ${toolkitConfig.backendPort}`,
      );
    }
    return toolkitConfig;
  },
};
