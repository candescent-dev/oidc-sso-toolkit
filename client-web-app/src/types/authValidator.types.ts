export interface AuthValidatorConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  state?: string;
  code: string;
}

export interface AuthorizePayload {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  state?: string;
}
