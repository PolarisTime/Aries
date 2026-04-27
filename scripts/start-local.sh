#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_SCRIPT="$ROOT_DIR/scripts/env-local.sh"

if [[ -f "$ENV_SCRIPT" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_SCRIPT"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "未找到 pnpm，请先安装 pnpm 后重试。" >&2
  exit 1
fi

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "[aries] node_modules 不存在，先执行 pnpm install"
  (cd "$ROOT_DIR" && pnpm install)
fi

if [[ ! -f "$ROOT_DIR/.env.local" ]]; then
  echo "[aries] 生成 .env.local"
  bash "$ROOT_DIR/scripts/env-local.sh"
fi

cd "$ROOT_DIR"

echo "[aries] pnpm dev --host 0.0.0.0"
exec pnpm dev --host 0.0.0.0
