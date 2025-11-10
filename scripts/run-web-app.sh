#!/usr/bin/env bash
set -euo pipefail

# ---- Setup ----
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="oidc-sso-toolkit"
TAG="latest"
CONTAINER_NAME="oidc-sso-toolkit-container"
FRONTEND_PORT=${1:-8000}
BACKEND_PORT=${2:-9000}

# ---- Helpers ----
log() {
  echo -e "\033[1;34m[INFO]\033[0m $*"
}
warn() {
  echo -e "\033[1;33m[WARN]\033[0m $*"
}
error_exit() {
  echo -e "\033[1;31m[ERROR]\033[0m $*" >&2
  exit 1
}

# ---- Check if image exists ----
if ! docker images | grep -q "$IMAGE_NAME.*$TAG"; then
  error_exit "Docker image $IMAGE_NAME:$TAG not found. Please run ./scripts/init.sh first."
fi

# ---- Stop and remove existing container if it exists ----
if docker ps -a | grep -q "$CONTAINER_NAME"; then
  log "Stopping and removing existing container: $CONTAINER_NAME"
  docker stop "$CONTAINER_NAME" > /dev/null 2>&1 || true
  docker rm "$CONTAINER_NAME" > /dev/null 2>&1 || true
fi
# ---- Run the container ----
log "Starting container: $CONTAINER_NAME"
log "Port mapping: $FRONTEND_PORT:$FRONTEND_PORT (frontend), $BACKEND_PORT:$BACKEND_PORT (backend)"
log "Image: $IMAGE_NAME:$TAG"

docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$FRONTEND_PORT:$FRONTEND_PORT" \
  -p "$BACKEND_PORT:$BACKEND_PORT" \
  "$IMAGE_NAME:$TAG"

# ---- Check logs for errors ----
log "Checking container logs for errors..."

# ---- Check logs for errors ----
log "Checking container logs for errors..."
LOG_OUTPUT=$(docker logs "$CONTAINER_NAME" 2>&1 | tail -n 50)

if echo "$LOG_OUTPUT" | grep -Ei "error|exception|failed"; then
  error_exit "Startup errors detected in container logs. Please check logs using: docker logs -f $CONTAINER_NAME"
fi

# ---- Success Message ----
log "Container started successfully!"
log "Container ID: $(docker ps -q -f name=$CONTAINER_NAME)"
log "Frontend: http://localhost:$FRONTEND_PORT"
log "Backend: http://localhost:$BACKEND_PORT"
log ""
log "To view logs: docker logs -f $CONTAINER_NAME"
log "To stop container: docker stop $CONTAINER_NAME"
log "To remove container: docker rm $CONTAINER_NAME"
log "Web application is now running!"






