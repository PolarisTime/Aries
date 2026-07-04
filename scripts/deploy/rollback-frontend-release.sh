#!/usr/bin/env bash

set -euo pipefail

TARGET_RELEASE="previous"
FRONTEND_ROOT="/instance/steelx/frontend"

usage() {
  cat <<'EOF'
用法:
  bash rollback-frontend-release.sh \
    [--target-release previous|<release-id>] \
    [--frontend-root /instance/steelx/frontend]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-release) TARGET_RELEASE="$2"; shift 2 ;;
    --frontend-root) FRONTEND_ROOT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数: $1" >&2; usage; exit 1 ;;
  esac
done

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "缺少命令: $command_name" >&2
    exit 1
  fi
}

require_command flock

releases_dir="$FRONTEND_ROOT/releases"
current_link="$FRONTEND_ROOT/current"
previous_link="$FRONTEND_ROOT/previous"
shared_dir="$FRONTEND_ROOT/shared"

lock_file="$FRONTEND_ROOT/deploy.lock"
exec 9>"$lock_file"
if ! flock -n 9; then
  echo "已有前端发布或回滚正在执行，拒绝并发操作" >&2
  exit 1
fi

if [[ ! -L "$current_link" ]]; then
  echo "当前前端软链不存在: $current_link" >&2
  exit 1
fi

current_target="$(readlink -f "$current_link")"
if [[ "$TARGET_RELEASE" == "previous" ]]; then
  if [[ ! -L "$previous_link" ]]; then
    echo "previous 软链不存在，无法回滚" >&2
    exit 1
  fi
  target_frontend="$(readlink -f "$previous_link")"
else
  target_frontend="$releases_dir/$TARGET_RELEASE"
fi

if [[ ! -d "$target_frontend" || ! -f "$target_frontend/index.html" ]]; then
  echo "目标前端 release 不存在或不完整: $target_frontend" >&2
  exit 1
fi

release_id="$(basename "$target_frontend")"

run_hook() {
  local hook_name="$1"
  local hook_path="$shared_dir/$hook_name"
  if [[ -x "$hook_path" ]]; then
    "$hook_path" "$target_frontend" "$release_id"
  fi
}

echo "回滚前端到 release: $release_id"
run_hook "pre-rollback.sh"

ln -sfn "$current_target" "$previous_link"
ln -sfn "$target_frontend" "$current_link"

run_hook "post-rollback.sh"
echo "前端回滚完成: $release_id"
