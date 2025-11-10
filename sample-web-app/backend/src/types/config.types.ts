export interface SSOConfig {
  port: number;
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  response_type: string[];
  scopes: string[];
  auth_code_expires_in: number;
  alg: string;
  idTokenRsaKey: string;
  private_key: string;
  access_token_expires_in: number;
  id_token_expires_in: number;
  support_refresh_token: boolean;
}
