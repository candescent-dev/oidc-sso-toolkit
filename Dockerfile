# OIDC SSO Toolkit - Multi-stage Docker Build
# Builds frontend and backend from source, produces a minimal runtime image

# =============================================================================
# Stage 1: Build Backend
# =============================================================================
FROM node:20-alpine AS backend-builder

WORKDIR /build/backend
COPY sample-web-app/backend/package*.json ./
# Install ALL dependencies (including devDependencies) for build
RUN npm ci
COPY sample-web-app/backend .
# Create certs directory (may be needed during build)
RUN mkdir -p certs
RUN npm run build
# Prune dev dependencies for smaller runtime image
RUN npm prune --production

# =============================================================================
# Stage 2: Build Frontend
# =============================================================================
FROM node:20-alpine AS frontend-builder

# Install build dependencies for native modules (esbuild)
RUN apk add --no-cache python3 make g++

WORKDIR /build/frontend
COPY sample-web-app/frontend/package*.json ./
RUN npm ci
COPY sample-web-app/frontend .
# Use vite build directly (skip tsc -b which can have issues with project references)
RUN npx vite build

# =============================================================================
# Stage 3: Runtime Image
# =============================================================================
FROM node:20-alpine

LABEL org.opencontainers.image.source="https://github.com/candescent-dev/oidc-sso-toolkit"
LABEL org.opencontainers.image.description="OIDC SSO Toolkit - Local development environment for OIDC integrations"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Install serve for frontend static hosting
RUN npm install -g serve

# Copy built artifacts
COPY --from=backend-builder /build/backend/dist ./backend/dist
COPY --from=backend-builder /build/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /build/backend/package.json ./backend/
COPY --from=frontend-builder /build/frontend/build ./frontend/build

# Copy configuration files
COPY sample-web-app/config.json ./config.json
COPY sample-web-app/backend/cache.json ./backend/cache.json
COPY sample-web-app/backend/src/ssoConfig ./backend/src/ssoConfig

# Copy default development certificates
COPY sample-web-app/backend/certs/private.pem ./backend/certs/private.pem
COPY sample-web-app/backend/certs/public.pem ./backend/certs/public.pem

# Copy startup script and ensure Unix line endings (remove CR if present)
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh && \
    tr -d '\r' < /app/start.sh > /app/start.sh.tmp && \
    mv /app/start.sh.tmp /app/start.sh && \
    chmod +x /app/start.sh

# Expose ports
EXPOSE 8080 9000

# Start both services using sh to ensure proper execution
CMD ["sh", "/app/start.sh"]

