#!/bin/bash
set -e
cd /home/team/shared/platform
echo "=== Building ==="
rm -rf .next
bun run build 2>&1
echo "=== Committing ==="
git add -A
git commit -m "feat: Add EFT payment page + fix intelligence-brief await" 2>&1 || echo "Nothing to commit"
echo "=== Pushing ==="
git push origin master 2>&1
echo "=== Deploying ==="
bunx vercel deploy --prod --yes --token "$VERCEL_TOKEN" 2>&1
echo "=== DONE ==="
