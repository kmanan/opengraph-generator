#!/usr/bin/env bash
set -euo pipefail

BACKEND="${OPENGRAPH_BACKEND:-${1:-http://localhost:6736}}"
INSTALL_DIR="${OPENGRAPH_MCP_INSTALL_DIR:-$HOME/.opengraph-mcp}"
REPO="${OPENGRAPH_MCP_REPO:-https://github.com/kmanan/opengraph-generator.git}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need git
need node
need npm
need claude

mkdir -p "$(dirname "$INSTALL_DIR")"

if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" fetch --depth 1 origin main
  git -C "$INSTALL_DIR" checkout -q main
  git -C "$INSTALL_DIR" reset --hard -q origin/main
else
  rm -rf "$INSTALL_DIR"
  git clone --depth 1 --filter=blob:none --sparse "$REPO" "$INSTALL_DIR"
fi

git -C "$INSTALL_DIR" sparse-checkout set mcp
npm --prefix "$INSTALL_DIR/mcp" ci --omit=dev --workspaces=false

claude mcp remove opengraph >/dev/null 2>&1 || true
claude mcp add --scope user --transport stdio --env OPENGRAPH_BACKEND="$BACKEND" \
  opengraph -- node "$INSTALL_DIR/mcp/bin.js"

echo "OpenGraph MCP installed. Restart Claude Code. Backend: $BACKEND"
