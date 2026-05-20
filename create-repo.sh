#!/bin/bash
# ── create-repo.sh ────────────────────────────────────────────────────────────
# Creates the GitHub repo and pushes all code in one shot.
# Run from anywhere — it downloads the repo folder from the zip below.
#
# Usage:  bash create-repo.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

TOKEN="YOUR_GITHUB_TOKEN"
OWNER="pguerrero112"
REPO="hakkoda-spcs-tasty-bytes"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Creating GitHub repo: $OWNER/$REPO"
echo "═══════════════════════════════════════════════════"

# 1. Create repo on GitHub
curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{
    \"name\": \"$REPO\",
    \"description\": \"Tasty Bytes Analytics — Snowpark Container Services reference implementation. Hakkoda Capstone.\",
    \"private\": false,
    \"auto_init\": false
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Repo created:', d.get('html_url','ERROR: '+str(d)))"

echo ""
echo "→ Initializing git and pushing code..."

cd "$(dirname "$0")"

git init
git config user.email "capstone@hakkoda.io"
git config user.name  "Hakkoda Capstone"
git add .
git commit -m "feat: initial commit — Tasty Bytes SPCS reference implementation

- Node.js + Express backend with franchise, trucks, and cities endpoints
- React 18 frontend with Home, Details (trucks), and Cities views
- NGINX router for CORS handling inside SPCS
- Dark mode + service status indicator (Hakkoda additions)
- /health endpoint for SPCS monitoring
- Full SQL setup script + architecture docs
- Build-and-push script for SPCS deployment"

git remote add origin "https://$TOKEN@github.com/$OWNER/$REPO.git"
git branch -M main
git push -u origin main

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Done! Repo is live at:"
echo "  https://github.com/$OWNER/$REPO"
echo "═══════════════════════════════════════════════════"
