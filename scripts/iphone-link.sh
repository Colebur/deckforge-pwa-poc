#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Run scripts/dev.sh in another window first. This tunnel serves only dist/ files.
if command -v cloudflared >/dev/null 2>&1; then
  exec cloudflared tunnel --url http://127.0.0.1:4173 --no-autoupdate
elif [ -x .tools/cloudflared ]; then
  exec .tools/cloudflared tunnel --url http://127.0.0.1:4173 --no-autoupdate
fi
echo "cloudflared isn't installed. See README.md for the official free HTTPS test-link setup."
exit 1
