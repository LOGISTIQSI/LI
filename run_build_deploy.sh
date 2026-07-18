#!/bin/bash
set -e
cd /home/team/shared/platform

echo "=== 1. Cleaning previous build ==="
rm -rf .next

echo "=== 2. Building ==="
bun run build

echo "=== 3. Git add, commit, push ==="
git add src/app/payment/page.tsx src/components/layout/Sidebar.tsx run_build_deploy.sh
git commit -m "feat: Add EFT-only payment page with FNB banking details

- New /payment page with FNB account details, copy-to-clipboard, mailto link
- Added Payment link (CreditCard icon) to sidebar navigation
- Uses existing dark/light theme design system
- No API routes or database changes"

echo "=== 4. Push to GitHub ==="
git push origin master

echo "=== 5. Deploy to Vercel ==="
bunx vercel deploy --prod --yes --token "$VERCEL_TOKEN"

echo "=== DONE ==="
echo "Platform: https://platform-lac-zeta-44.vercel.app"
echo "Payment page: https://platform-lac-zeta-44.vercel.app/payment"
