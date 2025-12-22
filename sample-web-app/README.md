# Sample Web App

The main OIDC SSO Toolkit application, consisting of a React frontend, NestJS backend, and internal validator for E2E testing.

## Structure

```
sample-web-app/
├── frontend/      # React UI for configuration and flow initiation
├── backend/       # NestJS mock OIDC Identity Provider
├── validator/     # Internal E2E test harness (see below)
├── test/          # Playwright E2E tests
└── config.json    # Port configuration
```

### About the Validator

The `validator/` directory contains a NestJS service that programmatically tests the OIDC authorization code flow. It is used internally by:

- **Playwright E2E tests** - Automated test suite that spins up the validator
- **"Run Validator" UI button** - Manual trigger from the frontend

The validator:
1. Calls `/authorize` with client credentials
2. Exchanges the auth code for tokens via `/token`
3. Validates the ID token signature using the JWK
4. Verifies issuer (`iss`) and audience (`aud`) claims

> **Note:** Partners/FIs typically don't need to run the validator directly. It serves as reference code for implementing OIDC client logic.

## Quick Start

### Backend

```bash
cd backend
npm install
npm run start:dev
```

Runs at `http://localhost:9000`

### Frontend

```bash
cd frontend
npm install
npm start
```

Runs at `http://localhost:8000`

## Configuration

Edit `config.json` to change ports:

```json
{
  "frontendPort": 8000,
  "backendPort": 9000
}
```

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Backend E2E tests
cd backend && npm run test:e2e

# Frontend E2E tests (Playwright)
npm run test:e2e
```
