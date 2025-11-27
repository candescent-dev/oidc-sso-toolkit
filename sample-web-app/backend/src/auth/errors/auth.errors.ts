export const ERROR_CODE = {
    INVALID_CLIENT:'Authentication failed: invalid client_id or unauthenticated client',
    AUTH_CODE_MISSING:'Missing Authorization code',
    REQUEST_HEADER_MISSING_AUTHORIZATION:'Required Authorization header is missing',
    AUTH_CREDENTIALS_MISSING:'Required Authorization header credentials are missing',
    INVALID_EXPIRE_AUTH_CODE:'Authentication failed: invalid or expired authorization code',
    MISSING_REQUIRED_PARAMS:'Required parameters are missing client_id or redirect_uri or response_type',
    AUTH_CODE_GENERATION_FAILED:'Failed to generate authorization code'
}