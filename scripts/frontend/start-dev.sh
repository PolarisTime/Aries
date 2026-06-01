#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARIES_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck disable=SC1090
source "$ARIES_DIR/scripts/env/dev.sh"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "未找到 pnpm，请先安装 pnpm 后重试。" >&2
  exit 1
fi

if [[ ! -d "$ARIES_DIR/node_modules" ]]; then
  echo "[aries:dev] node_modules 不存在，先执行 pnpm install"
  (cd "$ARIES_DIR" && pnpm install)
fi

cd "$ARIES_DIR"

echo "[aries:dev] pnpm dev --host 0.0.0.0 --port ${FRONTEND_PORT:-3100}"
exec pnpm dev --host 0.0.0.0 --port "${FRONTEND_PORT:-3100}" --mode development
