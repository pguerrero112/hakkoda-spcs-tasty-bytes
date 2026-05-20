#!/bin/bash
# ── build-and-push.sh ─────────────────────────────────────────────────────────
# Builds all three Docker images for linux/amd64 (required for SPCS),
# tags them, and pushes to your Snowflake Image Repository.
#
# Usage:
#   export REPO_URL=<your_account>.registry.snowflakecomputing.com/frostbyte_tasty_bytes_[user]/app/tasty_app_repository_[user]
#   export ADMIN_USER=<your_snowflake_username>
#   bash build-and-push.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

if [ -z "$REPO_URL" ] || [ -z "$ADMIN_USER" ]; then
  echo "Error: REPO_URL and ADMIN_USER must be set."
  echo "  export REPO_URL=<your_repo_url>"
  echo "  export ADMIN_USER=<your_snowflake_username>"
  exit 1
fi

TAG="latest"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR/src"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Tasty Bytes SPCS — Build & Push"
echo "  Repo: $REPO_URL"
echo "  Tag:  $TAG"
echo "═══════════════════════════════════════════════"
echo ""

# ── Login to Snowflake image registry ────────────────────────────────────────
echo "→ Logging in to Snowflake registry..."
docker login "$REPO_URL" --username "$ADMIN_USER"
echo ""

build_and_push() {
  local name=$1
  local context=$2

  echo "─────────────────────────────────────────────"
  echo "→ Building: $name"
  docker image rm "$name:$TAG" 2>/dev/null || true
  docker build --rm --platform linux/amd64 -t "$name:$TAG" "$context"

  echo "→ Tagging and pushing: $name"
  docker image rm "$REPO_URL/$name:$TAG" 2>/dev/null || true
  docker tag "$name:$TAG" "$REPO_URL/$name:$TAG"
  docker push "$REPO_URL/$name:$TAG"
  echo "  ✓ $REPO_URL/$name:$TAG"
  echo ""
}

build_and_push "backend_service_image"  "$SRC/backend"
build_and_push "frontend_service_image" "$SRC/frontend/frontend"
build_and_push "router_service_image"   "$SRC/frontend/router"

echo "═══════════════════════════════════════════════"
echo "  All images pushed successfully."
echo "  Verify in Snowflake:"
echo "  CALL SYSTEM\$REGISTRY_LIST_IMAGES('/<db>/app/<repo>');"
echo "═══════════════════════════════════════════════"
