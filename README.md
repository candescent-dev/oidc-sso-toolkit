# OIDC SSO Toolkit

A local development toolkit for partners and financial institutions (FIs) to build and test OpenID Connect (OIDC) Single Sign-On integrations. This toolkit simulates an OIDC Identity Provider, allowing you to develop and validate your OIDC client implementation before connecting to production environments.

## Features

- **Mock OIDC Identity Provider** - Full OAuth2 authorization code flow
- **Dynamic Client Credentials** - Auto-generated `client_id` and `client_secret`
- **JWT ID Tokens** - RS256-signed tokens with configurable claims
- **E2E Validation** - Automated tests to verify your integration
- **Downloadable Artifacts** - Metadata and JWK files for your client app

**Note** - The following installation steps work across all operating systems, including macOS, Windows, and Linux.

## Quick Start - Local Machine Native Setup

### Prerequisites

- **Node.js** v20+ (LTS recommended)
- **npm** (included with Node.js)

### 1. Clone the Repository

```bash
git clone https://github.com/candescent-dev/oidc-sso-toolkit.git
cd oidc-sso-toolkit
```
*Note - Make sure to setup and start backend server, before installing frontend server.* 

> **Configure Backend & Frontend Port (Optional):** 
*By default the frontend application binds to port 8000, and the backend application binds to port 9000. However, if required, these ports can be changed to any other desired values. Update the port numbers in /sample-web-app/config.json to new values for both frontend and backend, and restart the server to apply the updated ports.* 

### 2. Setup the Backend

```bash
cd sample-web-app/backend
npm install

> Note: If the above command triggers a security error. Please Bypass the security using the command here: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass.

# Build and start
npm run build
npm start
```
> **Validation of server health (Optional)**: *Validate the server health here - 'http://localhost:9000/api/health'. If the backend port is modified, then open  
'http://localhost:{port}/api/health'* 

> **Note:** Default development certificates are included in `certs/` for convenience. For production use, generate your own keys (see [Security Notice](#security-notice) below).

> **For development with hot-reload:** Use `npm run start:dev` instead of `npm run build && npm start`

### 3. Start the Frontend

Open a new terminal:

```bash
cd sample-web-app/frontend
npm install
npm start
```
> Note - If the above command triggers a security error. Please Bypass the security using the command here: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass.

> **Validation of server health (Optional)**: *Validate the server health here - 'http://localhost:8000/api/health'. If the backend port is modified, then open  
http://localhost:{port}/api/health* 

### 4. Open the Toolkit

Navigate to `http://localhost:8000`(If not 8000 then 'http://localhost:{port}')  in your browser.

---

## How It Works

### Configuration Page

When the toolkit loads, it automatically generates:

| Field | Description |
|-------|-------------|
| **Client ID** | Public identifier for your OIDC client |
| **Client Secret** | Secret key for token exchange |

> ⚠️ Credentials expire after **15 minutes** and auto-regenerate.

### Downloadable Files

| File | Purpose |
|------|---------|
| **Metadata** | OIDC discovery document with endpoints and supported scopes |
| **JWK** | RSA public key for validating ID token signatures |

### OIDC Flow Options

- **Open in iframe** - Embed the auth flow in your page
- **Open in new tab** - Standard redirect-based flow

---

## OIDC Endpoints

The toolkit exposes standard OIDC endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/authorize` | GET | Authorization endpoint - returns redirect URL with auth code |
| `/api/auth/token` | POST | Token endpoint - exchanges code for tokens |
| `/api/client` | POST | Generate new client credentials |
| `/api/client` | GET | Retrieve current credentials |
| `/api/health` | GET | Health check |

### Token Response

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "access_token": "abc123...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### ID Token Claims

| Claim | Description |
|-------|-------------|
| `iss` | Issuer (https://www.digitalinsight.com) |
| `sub` | Subject identifier |
| `aud` | Audience (your client_id) |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp |
| `email` | User email |
| `given_name` | First name |
| `family_name` | Last name |
| `phone_number` | Phone number |
| `birthday` | Date of birth |
| `preferred_username` | Username |

---

## Validation

### Running the Validator

1. Configure your **Init URL** and **Callback Host** on the home page
2. Click **Submit** and then click **Start OIDC SSO** to start the OIDC flow.
3. Navigate to the **OIDC Validator** page
4. Click **Run Validator** to execute E2E tests

The validator tests:
- Client credential generation
- Authorization code flow
- Token exchange
- ID token validation

### Validation Reports

After running the validator, download:
- **e2e-report.html** - Human-readable test report
- **jest-e2e.xml** - JUnit XML for CI integration

---

## Configuration

### Port Configuration

Edit `sample-web-app/config.json`:

```json
{
  "frontendPort": 8000,
  "backendPort": 9000
}
```

### Token Expiration

Edit `sample-web-app/backend/src/ssoConfig/sso-config.json`:

```json
{
  "auth_code_expires_in": 900,
  "access_token_expires_in": 900,
  "id_token_expires_in": 900
}
```

Values are in seconds (900 = 15 minutes).

---

## Alternative Setup: Docker

For quick testing without installing Node.js, use the pre-built Docker image:

```bash
# Pull the image
docker pull ghcr.io/candescent-dev/oidc-sso-toolkit:latest

# Run the container
docker run -p 9000:9000 -p 8000:8000 ghcr.io/candescent-dev/oidc-sso-toolkit:latest
```

Then open `http://localhost:8000` in your browser.

### Build Locally (Optional)

If you prefer to build the Docker image yourself:

```bash
git clone https://github.com/candescent-dev/oidc-sso-toolkit.git
cd oidc-sso-toolkit
docker build -t oidc-sso-toolkit .
docker run -p 9000:9000 -p 8000:8000 oidc-sso-toolkit
```

---

## Project Structure

```
oidc-sso-toolkit/
├── sample-web-app/
│   ├── frontend/          # React UI for configuration
│   ├── backend/           # NestJS mock OIDC Identity Provider
│   ├── validator/         # Internal E2E test harness (see below)
│   ├── test/              # Playwright E2E tests
│   └── config.json        # Port configuration
└── Dockerfile             # Multi-stage build for Docker users
```

### Component Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React, Redux Toolkit, Vite | Configuration UI and flow initiator |
| **Backend** | NestJS | Mock OIDC Identity Provider |
| **Validator** | NestJS | Internal test harness for E2E validation |

### About the Validator

The `validator/` directory contains an internal test harness used by the E2E tests and the "Run Validator" UI feature. It programmatically executes the OIDC authorization code flow to verify the toolkit is working correctly.

**Note for partners/FIs:** You typically don't need to run the validator directly. Instead:
- Use the **sample-web-app** as a mock IdP to test your own application
- Run the E2E tests via Playwright if you want automated verification
- The validator can serve as reference code for implementing OIDC client logic

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Credentials expired message | 15-minute TTL | Page auto-refreshes; wait or manually refresh |
| Port already in use | Another service running | Edit `config.json` to change ports |
| Token validation fails | JWK mismatch | Re-download JWK from the toolkit |
| Backend won't start | Missing private key | Default keys should be in `certs/`. If missing, run: `openssl genrsa -out certs/private.pem 2048` |

---

## Security Notice

**Default Development Certificates**

This toolkit includes pre-generated RSA keys in `sample-web-app/backend/certs/` for convenience:

- ✅ **Safe for local development and testing**
- ❌ **NOT secure for production use**
- ❌ **NOT secure for QA/staging environments**

### For Production Use

If deploying to production or QA, generate your own keys:

```bash
cd sample-web-app/backend
cd dbk-devex-oidc-sso-toolkit\sample-web-app\backend; node generate-keys.js

```

---

## Development

### Running Tests

```bash
# Backend unit tests
cd sample-web-app/backend
npm test

# Backend E2E tests
npm run test:e2e

# Frontend E2E tests (requires Playwright)
cd sample-web-app
npx playwright test
```

### Tech Stack

- **Frontend**: React 19, Redux Toolkit, React Router
- **Backend**: NestJS 11, jsonwebtoken, class-validator
- **Testing**: Jest, Supertest, Playwright

---

## Contributing

This repository is a **read-only mirror**. We do not accept pull requests. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for how to provide feedback.

## License

MIT License - see [LICENSE](LICENSE) for details.
