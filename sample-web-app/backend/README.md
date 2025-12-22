# Backend

NestJS application that implements a mock OIDC Identity Provider.

## Features

- OAuth2 authorization code flow
- JWT ID token generation (RS256)
- Dynamic client credential generation
- In-memory token storage with automatic cleanup
- E2E test execution endpoint

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Private Key (Required)

The backend needs an RSA private key to sign JWT tokens:

```bash
mkdir -p certs
openssl genrsa -out certs/private.pem 2048
```

### 3. Build and Run

```bash
npm run build
npm start
```

Runs at `http://localhost:9000`

### Development Mode (with hot-reload)

```bash
npm run start:dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/client` | POST | Generate new credentials |
| `/api/client` | GET | Retrieve cached credentials |
| `/api/auth/authorize` | GET | Authorization endpoint |
| `/api/auth/token` | POST | Token endpoint |
| `/api/auth/auth-setting` | POST | Store auth settings |
| `/api/e2e-test/run` | GET | Run E2E tests |
| `/api/publish-config` | GET | Export configuration |

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Configuration

Token expiration is configured in `src/ssoConfig/sso-config.json`:

```json
{
  "auth_code_expires_in": 900,
  "access_token_expires_in": 900,
  "id_token_expires_in": 900
}
```

Values are in seconds.

## Troubleshooting

| Error | Solution |
|-------|----------|
| `Private key file not found` | Run: `mkdir -p certs && openssl genrsa -out certs/private.pem 2048` |
| `Cannot find module dist/src/main.js` | Run: `npm run build` first |
