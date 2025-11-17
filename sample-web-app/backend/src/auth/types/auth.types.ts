export interface AuthCodeData {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  created_at: number;
  expiresAt: number;
}

export interface AccessTokenData {
  client_id: string;
  access_token: string;
  created_at: number;
  expiresAt: number;
}

export interface UserClaims {
  iss: string;
  sub: string;
  aud: string;
  email: string;
  given_name: string;
  family_name: string;
  birthday: string;
  preferred_username: string;
  phone_number: string;
}
