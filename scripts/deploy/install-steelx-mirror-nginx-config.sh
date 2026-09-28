#!/usr/bin/env bash

# 为 SteelX 前端安装「镜像端口」Nginx 配置(默认 7777 + TLS)。
#
# 与主站 (conf.d/steelx.conf, in1ove.com:443) 完全隔离、可独立安装/回滚:
#   - 独立 server_name, 不覆盖任何现有站点;
#   - 静态资源与主站共用同一个 frontend/current 符号链接, 零拷贝零漂移;
#   - /api/ 反代到同一个后端端口与数据库;
#   - 安全响应头与主站模板保持一致(HSTS/CSP/X-Frame-Options/nosniff/Referrer-Policy/
#     Permissions-Policy), 避免新入口成为"弱化版"暴露面。
#
# 说明: 本文件不定义 map, 以免与 steelx.conf 的 map 重名导致 nginx -t 失败。
#
# 用法:
#   bash scripts/deploy/install-steelx-mirror-nginx-config.sh --mirror-port 7777

set -Eeuo pipefail

RELEASE_ROOT="/instance/steelx"
FRONTEND_ROOT="/instance/steelx/frontend"
BACKEND_PORT="57217"
MIRROR_PORT="7777"
MIRROR_HTTP_REDIRECT_PORT=""
MIRROR_SERVER_NAMES="erp-mirror.in1ove.com steelx-mirror.in1ove.com in1ove.com"
SSL_CERTIFICATE="/instance/ssl/fullchain.crt"
SSL_CERTIFICATE_KEY="/instance/ssl/privkey.key"
NGINX_CONF_DIR="/etc/nginx/conf.d"
NGINX_WORKER_USER="sakura"
NGINX_WORKER_GROUP="sakura"

usage() {
  cat <<'EOF'
用法:
  bash scripts/deploy/install-steelx-mirror-nginx-config.sh [选项]

选项:
  --release-root <dir>             SteelX 发布根目录, 默认 /instance/steelx
  --frontend-root <dir>            SteelX 前端根目录, 默认 /instance/steelx/frontend
  --backend-port <port>            后端端口, 默认 57217
  --mirror-port <port>             镜像 HTTPS 端口, 默认 7777; 传 none/0 表示不安装
  --mirror-server-names "<names>"  镜像域名(空格分隔), 默认 erp-mirror.in1ove.com steelx-mirror.in1ove.com in1ove.com
  --mirror-http-redirect-port <p>  可选: 额外为该域名安装 80 端口跳转(默认不安装, 避免与主站冲突)
  --ssl-certificate <path>         TLS 证书链, 默认 /instance/ssl/fullchain.crt
  --ssl-certificate-key <path>     TLS 私钥, 默认 /instance/ssl/privkey.key
  --nginx-conf-dir <dir>           Nginx conf.d 目录, 默认 /etc/nginx/conf.d
  --nginx-worker-user <user>       Nginx worker 用户, 默认 sakura
  --nginx-worker-group <group>     Nginx worker 用户组, 默认 sakura
  -h, --help                       查看帮助
EOF
}

log() {
  printf '[aries-nginx-mirror] %s\n' "$*" >&2
}

fail() {
  printf '[aries-nginx-mirror] ERROR: %s\n' "$*" >&2
  exit 1
}

run_as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
    return
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    fail "当前用户不是 root, 且缺少 sudo, 无法安装 Nginx 配置"
  fi
  if [[ -n "${STEELX_SUDO_PASSWORD:-}" ]]; then
    printf '%s\n' "$STEELX_SUDO_PASSWORD" | sudo -S "$@"
    return
  fi
  sudo -n "$@"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release-root) RELEASE_ROOT="$2"; shift 2 ;;
    --frontend-root) FRONTEND_ROOT="$2"; shift 2 ;;
    --backend-port) BACKEND_PORT="$2"; shift 2 ;;
    --mirror-port) MIRROR_PORT="$2"; shift 2 ;;
    --mirror-server-names) MIRROR_SERVER_NAMES="$2"; shift 2 ;;
    --mirror-http-redirect-port) MIRROR_HTTP_REDIRECT_PORT="$2"; shift 2 ;;
    --ssl-certificate) SSL_CERTIFICATE="$2"; shift 2 ;;
    --ssl-certificate-key) SSL_CERTIFICATE_KEY="$2"; shift 2 ;;
    --nginx-conf-dir) NGINX_CONF_DIR="$2"; shift 2 ;;
    --nginx-worker-user) NGINX_WORKER_USER="$2"; shift 2 ;;
    --nginx-worker-group) NGINX_WORKER_GROUP="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) fail "未知选项: $1" ;;
  esac
done

if [[ "$MIRROR_PORT" == "none" || "$MIRROR_PORT" == "0" ]]; then
  log "mirror-port=$MIRROR_PORT, 跳过镜像端口安装"
  exit 0
fi

[[ "$MIRROR_PORT" =~ ^[0-9]+$ ]] || fail "镜像端口必须是数字: $MIRROR_PORT"
[[ -n "$MIRROR_SERVER_NAMES" ]] || fail "镜像域名不能为空"
[[ -f "$SSL_CERTIFICATE" ]] || fail "TLS 证书链不存在: $SSL_CERTIFICATE"
[[ -f "$SSL_CERTIFICATE_KEY" ]] || fail "TLS 私钥不存在: $SSL_CERTIFICATE_KEY"

log_file_dir="$RELEASE_ROOT/logs"
target_conf="$NGINX_CONF_DIR/steelx-mirror-$MIRROR_PORT.conf"
client_body_temp_path="$FRONTEND_ROOT/nginx-client-body"
tmp_conf="$(mktemp)"
backup_conf=""

cleanup() {
  rm -f -- "$tmp_conf"
}
trap cleanup EXIT

restore_nginx_config() {
  if [[ -n "$backup_conf" ]]; then
    log "恢复上一版镜像 Nginx 配置: $backup_conf"
    run_as_root cp -a "$backup_conf" "$target_conf"
    return
  fi
  log "删除本次新安装的镜像 Nginx 配置: $target_conf"
  run_as_root rm -f -- "$target_conf"
}

run_as_root mkdir -p "$log_file_dir"
run_as_root mkdir -p "$client_body_temp_path"
run_as_root chown "$NGINX_WORKER_USER:$NGINX_WORKER_GROUP" "$client_body_temp_path"
run_as_root chmod 700 "$client_body_temp_path"

# nginx 变量的 $ 需要在 heredoc 中保持字面量, 故统一转义。
cat > "$tmp_conf" <<EOF
# 由 scripts/deploy/install-steelx-mirror-nginx-config.sh 生成, 请勿手改。
# 镜像入口: https://<mirror-server-name>:${MIRROR_PORT}/  (静态资源与主站同一份)
EOF

if [[ -n "$MIRROR_HTTP_REDIRECT_PORT" ]]; then
  cat >> "$tmp_conf" <<EOF

server {
    listen $MIRROR_HTTP_REDIRECT_PORT;
    server_name $MIRROR_SERVER_NAMES;

    location / {
        return 301 https://\$host:$MIRROR_PORT\$request_uri;
    }
}
EOF
fi

cat >> "$tmp_conf" <<EOF

server {
    listen $MIRROR_PORT ssl;
    listen [::]:$MIRROR_PORT ssl;
    http2 on;
    server_name $MIRROR_SERVER_NAMES;

    ssl_certificate $SSL_CERTIFICATE;
    ssl_certificate_key $SSL_CERTIFICATE_KEY;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:STEELXMIRRORSSL:10m;
    ssl_session_timeout 10m;

    server_tokens off;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' http://localhost:8000 http://localhost:18000; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: http://localhost:8000 http://localhost:18000 ws://localhost:8000 ws://localhost:18000; frame-src 'self' blob:; manifest-src 'self'" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "0" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), geolocation=(), microphone=(), payment=(), usb=()" always;

    root $FRONTEND_ROOT/current;
    index index.html;

    access_log $log_file_dir/mirror-$MIRROR_PORT.access.log;
    error_log  $log_file_dir/mirror-$MIRROR_PORT.error.log;

    client_max_body_size 25m;
    client_body_temp_path $client_body_temp_path 1 2;
    client_body_buffer_size 64k;

    location /uploads/ {
        alias $RELEASE_ROOT/shared/uploads/;
        expires 7d;
        access_log off;
    }

    location /assets/ {
        try_files \$uri =404;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    location = /_app/cache {
        return 204;
    }

    location ^~ /api/v2.0/setup {
        limit_except GET HEAD OPTIONS {
            allow 127.0.0.1;
            allow ::1;
            deny all;
        }

        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_read_timeout 120s;
    }

    location /api/ {
        client_max_body_size 25m;

        proxy_pass http://127.0.0.1:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_read_timeout 120s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

if run_as_root test -f "$target_conf"; then
  backup_conf="$target_conf.bak.$(date +%Y%m%d%H%M%S)"
  log "备份当前镜像配置到 $backup_conf"
  run_as_root cp -a "$target_conf" "$backup_conf"
fi

log "安装镜像 Nginx 配置: $target_conf"
run_as_root install -m 0644 "$tmp_conf" "$target_conf"

if ! run_as_root nginx -t; then
  restore_nginx_config
  run_as_root nginx -t || true
  fail "nginx -t 校验失败, 已尝试恢复上一版镜像配置"
fi

if ! run_as_root nginx -s reload; then
  restore_nginx_config
  run_as_root nginx -t && run_as_root nginx -s reload || true
  fail "Nginx reload 失败, 已尝试恢复上一版镜像配置"
fi

log "镜像 Nginx 配置已安装并 reload: https://<mirror-host>:$MIRROR_PORT"
