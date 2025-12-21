# OIDC Validator

An internal E2E test harness that programmatically validates the OIDC authorization code flow. This component is used by the Playwright test suite and the "Run Validator" UI feature.

## Purpose

This validator serves as:
1. **E2E Test Target** - The Playwright tests automatically spawn this service to validate the full OIDC flow
2. **Reference Implementation** - Partners/FIs can examine this code to see how to implement OIDC client logic
3. **Debugging Tool** - Verify that the mock IdP (backend) is functioning correctly

> **Note:** Partners/FIs typically don't need to run this directly. Test your own application against the `sample-web-app` backend instead.

## What It Does

1. Calls `/authorize` endpoint with client credentials and state parameter
2. Extracts the authorization code from the redirect URL
3. Exchanges the auth code for tokens via `/token` endpoint
4. Validates the ID token signature using the JWK (RS256)
5. Verifies `iss` (issuer) and `aud` (audience) claims

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth-validator/call-authorize-and-token` | GET | Execute full OIDC flow |
| `/api/auth-validator/validate-id-token` | GET | Validate an ID token |
| `/api/health` | GET | Health check |

## Configuration

Edit `src/authValidatorConfig/config.json`:

```json
{
  "backendPort": 9000,
  "client_id": "",
  "client_secret": "",
  "redirect_uri": "http://localhost:7080/api/auth-validator/call-authorize-and-token"
}
```

> **Note:** The `client_id` and `client_secret` are automatically populated by the E2E tests. If running manually, obtain credentials from the sample-web-app frontend.

## Manual Usage (Advanced)

If you need to run the validator manually:

```bash
# 1. Start the sample-web-app backend first
cd ../backend && npm run start:dev

# 2. Get credentials from http://localhost:8000 (frontend)
# 3. Update src/authValidatorConfig/config.json with credentials

# 4. Start the validator
npm install
npm run start:dev
```

Runs at `http://localhost:7080`

## Technology

- **Framework**: NestJS
- **JWT Library**: jose (for token validation)
- **HTTP Client**: Axios
