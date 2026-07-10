#!/usr/bin/env bash
set -Eeuo pipefail

PORT="${DEPLOY_RUN_PORT:-5000}"
LOG_DIR="/app/work/logs/bypass"
RESTART_COUNT=0
MAX_RESTART_LOG=20

log() {
  echo "[daemon $(date '+%H:%M:%S')] $1" | tee -a "${LOG_DIR}/app.log"
}

log "守护进程启动，监控端口 ${PORT}"

while true; do
  if ! ss -tlnp 2>/dev/null | grep -q ":${PORT}[[:space:]]"; then
    RESTART_COUNT=$((RESTART_COUNT + 1))
    log "检测到服务停止，第 ${RESTART_COUNT} 次重启..."

    # Kill any stale processes
    pkill -f "node.*server/dist/main" 2>/dev/null || true
    sleep 1

    # Start server
    cd /workspace/projects
    DEPLOY_RUN_PORT="${PORT}" node server/dist/main.js -p "${PORT}" >> "${LOG_DIR}/app.log" 2>&1 &
    SERVER_PID=$!

    sleep 4

    # Verify it started
    if ss -tlnp 2>/dev/null | grep -q ":${PORT}[[:space:]]"; then
      log "重启成功 (PID: ${SERVER_PID})"
    else
      log "重启失败，5秒后重试..."
    fi

    # Limit restart log spam
    if [ ${RESTART_COUNT} -gt ${MAX_RESTART_LOG} ]; then
      RESTART_COUNT=0
      log "已累计重启 ${MAX_RESTART_LOG}+ 次，继续监控中..."
    fi
  fi
  sleep 5
done
