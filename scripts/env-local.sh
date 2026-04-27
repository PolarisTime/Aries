#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_FILE="$ROOT_DIR/.env.local"

DEFAULT_APP_TITLE="${VITE_APP_TITLE:-Leo ERP}"
DEFAULT_API_BASE_URL="${VITE_API_BASE_URL:-/api}"
DEFAULT_PROXY_TARGET="${VITE_PROXY_TARGET:-http://127.0.0.1:11211}"

write_env_file() {
  printf '%s\n' \
    "VITE_APP_TITLE=${DEFAULT_APP_TITLE}" \
    "VITE_API_BASE_URL=${DEFAULT_API_BASE_URL}" \
    "VITE_PROXY_TARGET=${DEFAULT_PROXY_TARGET}" \
    > "$TARGET_FILE"
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  export VITE_APP_TITLE="$DEFAULT_APP_TITLE"
  export VITE_API_BASE_URL="$DEFAULT_API_BASE_URL"
  export VITE_PROXY_TARGET="$DEFAULT_PROXY_TARGET"
  return 0
fi

write_env_file
echo "已生成前端本地环境文件: $TARGET_FILE"
