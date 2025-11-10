FROM node:18-alpine AS backend

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/dist ./dist

FROM nginx:alpine AS frontend
COPY frontend/build /usr/share/nginx/html

FROM node:18-alpine
COPY --from=backend /app/backend /app/backend
COPY --from=frontend /usr/share/nginx/html /app/frontend

RUN npm install -g serve

EXPOSE 8000 9000

CMD sh -c "node /app/backend/dist/src/main.js & serve -s /app/frontend -l 8000"