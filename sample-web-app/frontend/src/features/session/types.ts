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
  IFRAME = "iframe",
  NEWTAB = "newTab",
}

/** Overall session state stored in Redux */
export interface SessionState {
  clientId: string;
  clientSecret: string;
  timeLeftMs: number;
  loading: boolean;
  error: string | null;
  initUrl: string;
  callbackHost: string;
  openOption: "" | OpenMode;
  iframeSettings?: IframeSettings;
}

/** Payload structure for setting form values */
export interface FormValuesPayload {
  initUrl: string;
  callbackHost: string;
  openOption: "" | OpenMode;
  iframeSettings?: IframeSettings;
}
