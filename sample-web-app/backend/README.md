# Overview

The system generates client credentials with a short-lived(15 minutes) expiry, manages RSA key pairs (public and private keys), signs ID Tokens using Candescent private key, and exposes JWKS endpoints for secure token verification.

## Compile and run the project

```bash
# install dependencies
$ npm install

# Start server
$ npm run start:dev

# production mode
$ npm run start:prod

#Default port: 9000

#Verify server health
Open backend in browser: http://localhost:9000/api/health

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```