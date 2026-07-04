#!/usr/bin/env bash

set -euo pipefail

ARCHIVE=""
SHA256_FILE=""
FRONTEND_ROOT="/instance/steelx/frontend"
KEEP_RELEASES=5

usage() {
  cat <<'EOF'
用法:
  bash install-frontend-release.sh \
    --archive /tmp/aries-frontend-release.tar.gz \
    [--sha256-file /tmp/aries-frontend-release.tar.gz.sha256] \
    [--frontend-root /instance/steelx/frontend] \
    [--keep-releases 5]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --archive) ARCHIVE="$2"; shift 2 ;;
    --sha256-file) SHA256_FILE="$2"; shift 2 ;;
    --frontend-root) FRONTEND_ROOT="$2"; shift 2 ;;
    --keep-releases) KEEP_RELEASES="$2"; shift 2 ;;
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
require_command mktemp
require_command sha256sum
require_command tar

if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
  echo "发布包不存在: ${ARCHIVE:-<empty>}" >&2
  exit 1
fi
if [[ -n "$SHA256_FILE" && ! -f "$SHA256_FILE" ]]; then
  echo "校验和文件不存在: $SHA256_FILE" >&2
  exit 1
fi
if [[ ! "$KEEP_RELEASES" =~ ^[0-9]+$ || "$KEEP_RELEASES" -lt 2 ]]; then
  echo "--keep-releases 必须是 >= 2 的整数" >&2
  exit 1
fi

timestamp="$(date +%Y%m%d%H%M%S)"
archive_name="$(basename "$ARCHIVE")"
release_id="${timestamp}-${archive_name%.tar.gz}"
releases_dir="$FRONTEND_ROOT/releases"
current_link="$FRONTEND_ROOT/current"
previous_link="$FRONTEND_ROOT/previous"
shared_dir="$FRONTEND_ROOT/shared"
release_dir="$releases_dir/$release_id"

mkdir -p "$FRONTEND_ROOT" "$releases_dir" "$shared_dir"
lock_file="$FRONTEND_ROOT/deploy.lock"
exec 9>"$lock_file"
if ! flock -n 9; then
  echo "已有前端发布或回滚正在执行，拒绝并发操作" >&2
  exit 1
fi

if [[ -n "$SHA256_FILE" ]]; then
  archive_dir="$(dirname "$ARCHIVE")"
  sha_name="$(basename "$SHA256_FILE")"
  echo "校验前端发布包 SHA256 ..."
  (cd "$archive_dir" && sha256sum -c "$sha_name")
fi

if [[ -e "$current_link" && ! -L "$current_link" ]]; then
  echo "$current_link 已存在但不是软链，拒绝发布" >&2
  exit 1
fi
if [[ -e "$previous_link" && ! -L "$previous_link" ]]; then
  echo "$previous_link 已存在但不是软链，拒绝发布" >&2
  exit 1
fi

old_frontend_target=""
if [[ -L "$current_link" ]]; then
  old_frontend_target="$(readlink -f "$current_link")"
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf -- "$tmp_dir"
}
trap cleanup EXIT

tar -xzf "$ARCHIVE" -C "$tmp_dir"
if [[ ! -f "$tmp_dir/frontend/index.html" ]]; then
  echo "发布包缺少 frontend/index.html" >&2
  exit 1
fi

run_hook() {
  local hook_name="$1"
  local hook_path="$shared_dir/$hook_name"
  if [[ -x "$hook_path" ]]; then
    "$hook_path" "$release_dir" "$release_id"
  fi
}

prune_old_releases() {
  [[ -d "$releases_dir" ]] || return 0

  local current_target=""
  local previous_target=""
  current_target="$(readlink -f "$current_link" 2>/dev/null || true)"
  previous_target="$(readlink -f "$previous_link" 2>/dev/null || true)"

  mapfile -t release_dirs < <(find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | awk '{print $2}')
  local index=0
  for dir in "${release_dirs[@]}"; do
    index=$((index + 1))
    if (( index <= KEEP_RELEASES )); then
      continue
    fi
    if [[ "$dir" == "$current_target" || "$dir" == "$previous_target" ]]; then
      continue
    fi
    rm -rf -- "$dir"
  done
}

echo "准备发布前端: $release_id"
mkdir -p "$release_dir"
cp -a "$tmp_dir/frontend/." "$release_dir/"
run_hook "pre-deploy.sh"

if [[ -n "$old_frontend_target" ]]; then
  ln -sfn "$old_frontend_target" "$previous_link"
fi
ln -sfn "$release_dir" "$current_link"

run_hook "post-deploy.sh"
prune_old_releases

rm -f -- "$ARCHIVE"
if [[ -n "$SHA256_FILE" ]]; then
  rm -f -- "$SHA256_FILE"
fi
rmdir "$(dirname "$ARCHIVE")" 2>/dev/null || true

echo "前端发布完成: $release_id"
