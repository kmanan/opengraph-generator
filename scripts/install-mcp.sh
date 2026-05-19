#!/usr/bin/env bash
set -euo pipefail

BACKEND="${OPENGRAPH_BACKEND:-${1:-http://localhost:6736}}"
INSTALL_DIR="${OPENGRAPH_MCP_INSTALL_DIR:-$HOME/.opengraph-mcp}"
BASE_URL="${OPENGRAPH_MCP_BASE_URL:-https://raw.githubusercontent.com/kmanan/opengraph-generator/main/mcp}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need curl
need node
need npm
need claude

rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

curl -fsSL "$BASE_URL/package.json" -o "$INSTALL_DIR/package.json"
curl -fsSL "$BASE_URL/package-lock.json" -o "$INSTALL_DIR/package-lock.json"
curl -fsSL "$BASE_URL/bin.js" -o "$INSTALL_DIR/bin.js"
chmod 755 "$INSTALL_DIR/bin.js"

npm --prefix "$INSTALL_DIR" ci --omit=dev --workspaces=false

claude mcp remove opengraph >/dev/null 2>&1 || true
claude mcp add --scope user --transport stdio --env OPENGRAPH_BACKEND="$BACKEND" \
  opengraph -- node "$INSTALL_DIR/bin.js"

echo "OpenGraph MCP installed. Restart Claude Code. Backend: $BACKEND"
