#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Optional portable Node location; otherwise use the installed Node.js runtime.
if [ -n "${DECKFORGE_NODE_DIR:-}" ]; then
  PATH="$DECKFORGE_NODE_DIR:$PATH"; export PATH
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js LTS from https://nodejs.org, then run this again."; exit 1
fi
if [ ! -f node_modules/typescript/bin/tsc ]; then
  npm install
fi
node node_modules/typescript/bin/tsc
node scripts/build.mjs
node --test tests/*.test.mjs
exec node scripts/serve.mjs "$@"
