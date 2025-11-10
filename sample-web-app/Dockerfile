# Base image for Node.js (for backend)
FROM node:18-alpine AS backend

WORKDIR /app/backend

# Copy backend files
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/dist ./dist

# Base image for serving React frontend
FROM nginx:alpine AS frontend

# Copy React build to nginx html directory
COPY frontend/build /usr/share/nginx/html

# Final stage: combine both
FROM node:18-alpine

# Copy backend from build stage
COPY --from=backend /app/backend /app/backend

# Copy frontend from build stage
COPY --from=frontend /usr/share/nginx/html /app/frontend

# Install serve to serve frontend
RUN npm install -g serve

# Expose ports
EXPOSE 8000 9000

# Start both frontend and backend
CMD sh -c "node /app/backend/dist/src/main.js & serve -s /app/frontend -l 8000"