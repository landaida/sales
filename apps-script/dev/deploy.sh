#!/usr/bin/env bash
# Robust deploy that keeps Web App permissions.
# Requirements: Node + clasp logged in; curl. No jq required.
set -euo pipefail

cd "$(dirname "$0")"

# Read Script ID and Deployment ID
SID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.clasp.json','utf8')).scriptId)")
DID=$(cat .deployid | tr -d '\r\n')

echo "→ Script ID     : $SID"
echo "→ Deployment ID : $DID"

# 1) Push sources & create a fresh version
npx -y @google/clasp push
VER=$(npx -y @google/clasp version "deploy $(date +%F_%T)" | sed -n 's/Created version \([0-9]*\)./\1/p')
if [[ -z "$VER" ]]; then
  VER=$(npx -y @google/clasp versions | tail -1 | awk '{print $1}')
fi
echo "→ Version       : $VER"

# 2) Redeploy reusing the SAME deploymentId (so URL doesn't change)
npx -y @google/clasp deploy --deploymentId "$DID" --description "redeploy $(date +%F_%T)" >/dev/null

# 3) Force Web App flags (ANYONE + USER_DEPLOYING).
#    The Apps Script API expects executeAs='USER_DEPLOYING' (not EXECUTE_AS_DEPLOYER).
TOKEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.clasprc.json','utf8')).token.access_token)")

echo "→ Patching WebApp access (ANYONE, USER_DEPLOYING)…"
curl -fSs -X PATCH \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://script.googleapis.com/v1/projects/$SID/deployments/$DID?updateMask=deploymentConfig.versionNumber,deploymentConfig.webApp.access,deploymentConfig.webApp.executeAs" \
  -d "{\"deploymentConfig\":{\"versionNumber\":$VER,\"webApp\":{\"access\":\"ANYONE\",\"executeAs\":\"USER_DEPLOYING\"}}}" >/dev/null

echo "✅ Web App permissions are set. URL remains the same."
