import { AuthSettingData } from '../../auth/types/authSetting.types';

export interface AppConfig extends AuthSettingData {
  frontendPort: number;
  backendPort: number;
}
