#!/usr/bin/env bash

set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

export ARIES_RUNTIME_ENV=dev
export VITE_APP_TITLE="${VITE_APP_TITLE:-Leo ERP}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"
export VITE_PROXY_TARGET="${VITE_PROXY_TARGET:-http://127.0.0.1:11211}"

write_frontend_env_file "$ARIES_DIR/.env.development.local"

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "已生成前端开发环境文件: $ARIES_DIR/.env.development.local"
fi
