#!/usr/bin/env bash
set -e

# 1) Build UI (production)
cd /mnt/ubuntu/home/shared/mine/sales/ui
npm run build
cd /mnt/ubuntu/home/shared/mine/sales

# 2) Ensure dist is tracked (force add)
git add -f ui/dist
git commit -m "build dist for gh-pages $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true

# 3) Publish subtree to gh-pages
# git push origin --delete gh-pages 2>/dev/null || true
git branch -D gh-pages 2>/dev/null || true
git subtree split --prefix ui/dist -b gh-pages
git push -f origin gh-pages:gh-pages
git branch -D gh-pages
echo "Published to gh-pages"
