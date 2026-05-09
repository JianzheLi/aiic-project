#!/usr/bin/env bash
set -euo pipefail

export APP_VERSION="${APP_VERSION:-$(git rev-parse --short HEAD)}"
export APP_BUILD_TIME="${APP_BUILD_TIME:-$(date '+%Y-%m-%d %H:%M')}"
export VITE_APP_VERSION="${VITE_APP_VERSION:-$APP_VERSION}"
export VITE_BUILD_TIME="${VITE_BUILD_TIME:-$APP_BUILD_TIME}"

echo "Building version ${APP_VERSION} at ${APP_BUILD_TIME}"
docker compose up -d --build
