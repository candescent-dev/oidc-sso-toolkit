/** Permissions available for iframe */
export interface Permissions {
  enableCamera: boolean;
  enableMic: boolean;
}

/** Settings specific to iframe option */
export interface IframeSettings {
  uniqueId: string;
  displayWidth: string;
  permissions: Permissions;
}

/** Enum for selecting how to open the callback host URL */
export enum OpenMode {
  IFRAME = 'iframe',
  NEWTAB = 'newTab',
}

/** Overall home state stored in Redux */
export interface HomeState {
  clientId: string;
  clientSecret: string;
  loading: boolean;
  error: string | null;
  initUrl: string;
  callbackHost: string;
  openOption: '' | OpenMode;
  iframeSettings?: IframeSettings;
  credentialsIssuedAt: number | null;
}

/** Payload structure for setting home data */
export interface HomeConfigPayload {
  initUrl: string;
  callbackHost: string;
  openOption: '' | OpenMode;
  iframeSettings?: IframeSettings;
}
