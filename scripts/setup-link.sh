#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ "$(uname -m)" != 'arm64' ]; then
  echo 'This helper is for Apple silicon Macs. Use the official cloudflared download for your Mac architecture.'; exit 1
fi
mkdir -p .tools
curl -fL https://github.com/cloudflare/cloudflared/releases/download/2026.9.3/cloudflared-darwin-arm64.tgz -o .tools/cloudflared.tgz
printf '%s\n' '587c2cfb1c230fe36c7fa7727da78be459dae028cabe8c001291999350f07095  .tools/cloudflared.tgz' | shasum -a 256 -c -
tar -xzf .tools/cloudflared.tgz -C .tools
.tools/cloudflared --version
