#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../.." && pwd)
BROWSER_BIN="$REPO_ROOT/.local-browser/chromium/usr/lib64/chromium-browser/chromium-browser"
DEPS_ROOT="$REPO_ROOT/.local-browser/deps"

if [[ ! -x "$BROWSER_BIN" ]]; then
  echo "Local Chromium binary not found: $BROWSER_BIN" >&2
  exit 1
fi

if [[ -d "$DEPS_ROOT" ]]; then
  LOCAL_LIB_PATH=$(find "$DEPS_ROOT" -type d -path '*/usr/lib64' | paste -sd: -)
  if [[ -n "$LOCAL_LIB_PATH" ]]; then
    export LD_LIBRARY_PATH="${LOCAL_LIB_PATH}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  fi
fi

exec "$BROWSER_BIN" "$@"
