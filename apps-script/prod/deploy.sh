#!/usr/bin/env bash
# Production deploy script for Apps Script WebApp
# - Keeps the same deploymentId (URL doesn't change)
# - Forces WebApp access to ANYONE_ANONYMOUS and executeAs USER_DEPLOYING
# Requirements:
#   * Run this inside apps-script/prod
#   * 'npx @google/clasp' available and logged-in (npx clasp login)
#   * '~/.clasprc.json' exists with a valid access_token for the same account
set -euo pipefail

# Ensure we are in apps-script/prod
cd "$(dirname "$0")"

# Read Script ID (must be the project Script ID starting with '1...')
if [[ ! -f ".clasp.json" ]]; then
  echo "❌ Missing .clasp.json in $(pwd)" >&2; exit 1
fi
SID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.clasp.json','utf8')).scriptId)")
if [[ -z "${SID}" ]]; then
  echo "❌ .clasp.json has no scriptId" >&2; exit 1
fi
if [[ "${SID}" =~ ^AKf ]]; then
  echo "❌ scriptId looks like a deploymentId (AKfy...). Paste the Script ID (starts with '1...') into .clasp.json" >&2
  exit 1
fi

# Read Deployment ID (must be AKfy... of the WebApp deployment)
if [[ ! -f ".deployid" ]]; then
  echo "❌ Missing .deployid (put your WebApp deployment id AKfy... on one line)" >&2; exit 1
fi
DID=$(tr -d '\r\n' < .deployid)
if [[ -z "${DID}" || ! "${DID}" =~ ^AKf ]]; then
  echo "❌ .deployid must contain your WebApp deployment id (AKfy...)" >&2; exit 1
fi

echo "→ Script ID     : ${SID}"
echo "→ Deployment ID : ${DID}"

# 1) Push sources & create a fresh version
npx -y @google/clasp push
VER=$(npx -y @google/clasp version "prod $(date +%F_%T)" | sed -n 's/Created version \([0-9]*\)./\1/p')
if [[ -z "$VER" ]]; then
  VER=$(npx -y @google/clasp versions | tail -1 | awk '{print $1}')
fi
if [[ -z "$VER" ]]; then
  echo "❌ Could not infer version number." >&2; exit 1
fi
echo "→ Version       : ${VER}"

# 2) Redeploy reusing the SAME deploymentId (URL remains stable)
npx -y @google/clasp deploy --deploymentId "${DID}" --description "prod $(date +%F_%T)" >/dev/null || true

# 3) Force Web App flags (ANYONE_ANONYMOUS + USER_DEPLOYING)
TOKEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.clasprc.json','utf8')).token.access_token)")
if [[ -z "${TOKEN}" ]]; then
  echo "❌ No OAuth token found (~/.clasprc.json). Run 'npx clasp login' with the correct account." >&2
  exit 1
fi

echo "→ Patching WebApp access (ANYONE_ANONYMOUS, USER_DEPLOYING)…"
curl -fSs -X PATCH \
  -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  "https://script.googleapis.com/v1/projects/${SID}/deployments/${DID}?updateMask=deploymentConfig.versionNumber,deploymentConfig.webApp.access,deploymentConfig.webApp.executeAs" \
  -d "{\"deploymentConfig\":{\"versionNumber\":${VER},\"webApp\":{\"access\":\"ANYONE_ANONYMOUS\",\"executeAs\":\"USER_DEPLOYING\"}}}" >/dev/null

echo "✅ PROD deployed (v${VER}) with public access restored."
echo "🔗 WebApp URL: https://script.google.com/macros/s/${DID}/exec"
