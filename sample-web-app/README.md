
# Sample-web-app Overview

Sample-web-app is a lightweight web application consisting of two  modules:
1. frontend
    •	Displays generated client credentials (client_id, client_secret, created_at).
    •	Allows downloading metadata (metadata.json) and JWKS files.
    •	Validates and decodes ID Tokens to securely display user information.
    
2. backend
    •	Generates client credentials with a short-lived expiry.
    •	Manages key pairs (RSA public/private keys).
    •	Signs ID Tokens using RSA.
    •	Exposes JWKS for token verification.
    
## dbk-oidc-sso-features-toolkit Directories

```
sample-web-app/
├── backend/
├── frontend/
├── test/
```

### sso-validator/
A module responsible for validating Single Sign-On (SSO) flows and ensuring secure authentication across integrated services.


## Running the Sample Web App (Backend + Frontend)

The sample application contains both the backend (NestJS) and frontend (React).

### Start the Backend Server

Open a terminal and run:

```bash
cd sample-web-app/backend
npm install
npm run start:dev
```

This starts the NestJS backend server in watch mode. The default port is defined inside the backend application (commonly `http://localhost:9000` unless configured otherwise).

### Start the Frontend Server

Open a new terminal window and run:

```bash
cd sample-web-app/frontend
npm install
npm start
```

The frontend React app will start on `http://localhost:8000` (as configured in the `start` script).

Once both servers are running:
- Access the **frontend** in your browser at `http://localhost:8000`.
- The frontend will communicate with the **backend** to generate client credentials, download metadata, and perform OIDC-related operations.