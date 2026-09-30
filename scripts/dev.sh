#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Use ordinary Node if installed, or the runtime already supplied by Codex on this Mac.
BUNDLED="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
if ! command -v node >/dev/null 2>&1; then
  if [ -x "$BUNDLED/node/bin/node" ]; then
    PATH="$BUNDLED/node/bin:$PATH"; export PATH
  else
    echo "Install Node.js LTS from https://nodejs.org, then run this again."; exit 1
  fi
fi
if [ ! -f node_modules/typescript/bin/tsc ]; then
  if command -v npm >/dev/null 2>&1; then npm install
  elif [ -x "$BUNDLED/bin/fallback/pnpm" ]; then "$BUNDLED/bin/fallback/pnpm" install
  else echo "npm is required to install TypeScript."; exit 1; fi
fi
node node_modules/typescript/bin/tsc
node scripts/build.mjs
node --test tests/model.test.mjs
exec node scripts/serve.mjs "$@"
