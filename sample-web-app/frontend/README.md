# Frontend

React application for configuring and initiating OIDC SSO flows. Built with Vite for fast development and zero vulnerabilities.

## Features

- Display auto-generated client credentials
- Download metadata and JWK files
- Configure Init URL and Callback Host
- Initiate OIDC flow (iframe or new tab)
- Run E2E validation and view reports

## Quick Start

```bash
npm install
npm start
```

Runs at `http://localhost:8000`

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server on port 8000 |
| `npm run build` | Build for production (output: `build/`) |
| `npm run preview` | Preview production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home - Client configuration |
| `/start-oidc-sso` | OIDC SSO Initiator |
| `/oidc-validator` | E2E Validation and Reports |

## Tech Stack

- React 19
- Redux Toolkit
- React Router 7
- Vite 6
- Vitest (testing)
- TypeScript 5
