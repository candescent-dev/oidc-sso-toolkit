export interface OidcSsoInitiatorState {
  loading: boolean;
  message: string;
  error: string | null;
}

export interface AuthSettingPayload {
  initUrl: string;
  callbackHost: string;
}

export interface AuthSettingResponse {
  message: string;
}
