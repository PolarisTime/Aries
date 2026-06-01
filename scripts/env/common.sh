#!/usr/bin/env bash

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "请通过 source 加载 scripts/env/common.sh。" >&2
  exit 1
fi

ARIES_ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARIES_SCRIPTS_DIR="$(cd "$ARIES_ENV_DIR/.." && pwd)"
ARIES_DIR="$(cd "$ARIES_SCRIPTS_DIR/.." && pwd)"
WORKSPACE_DIR="$(cd "$ARIES_DIR/.." && pwd)"

write_frontend_env_file() {
  local target_file="$1"
  printf '%s\n' \
    "VITE_APP_TITLE=${VITE_APP_TITLE}" \
    "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
    "VITE_PROXY_TARGET=${VITE_PROXY_TARGET}" \
    > "$target_file"
}
