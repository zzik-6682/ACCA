#!/bin/bash
echo "⚙️ dev_run.sh 开始运行 (生产单进程模式)"
set -Eeuo pipefail

cd "${COZE_WORKSPACE_PATH}"

PORT="${DEPLOY_RUN_PORT:-5000}"
PID_FILE="/tmp/coze-dev-run.pid"

# ---------------------------------------------------------
# 工具函数
# ---------------------------------------------------------
kill_process_tree() {
    local pid=$1
    local children
    children=$(pgrep -P "${pid}" 2>/dev/null || true)
    for child in ${children}; do
        kill_process_tree "${child}"
    done
    if kill -0 "${pid}" 2>/dev/null; then
        kill -9 "${pid}" 2>/dev/null || true
    fi
}

kill_port_if_listening() {
    local port=$1
    local pids
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${port}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u | paste -sd' ' - || true)
    if [[ -z "${pids}" ]]; then
        echo "Port ${port} is free."
        return
    fi
    for pid in ${pids}; do
        kill_process_tree "${pid}"
    done
    sleep 1
}

# ---------------------------------------------------------
# 1. 清理旧进程
# ---------------------------------------------------------
echo "🧹 Cleaning up previous processes..."
if [[ -f "${PID_FILE}" ]]; then
    old_pid=$(cat "${PID_FILE}" 2>/dev/null || true)
    if [[ -n "${old_pid}" ]] && kill -0 "${old_pid}" 2>/dev/null; then
        kill_process_tree "${old_pid}"
    fi
    rm -f "${PID_FILE}"
fi

kill_port_if_listening "${PORT}"

# ---------------------------------------------------------
# 2. 安装依赖（仅当 node_modules 不存在时）
# ---------------------------------------------------------
if [[ ! -d "node_modules" ]]; then
    echo "📦 Installing dependencies..."
    pnpm install --ignore-scripts
    echo "✅ Dependencies installed!"
else
    echo "✅ node_modules exists, skipping install"
fi

# ---------------------------------------------------------
# 3. 确保构建产物存在
# ---------------------------------------------------------
if [[ ! -f "dist-web/index.html" ]]; then
    echo "🔨 Building Taro H5..."
    pnpm build:web
    echo "✅ Taro H5 built!"
else
    echo "✅ dist-web exists, skipping Taro build"
fi

if [[ ! -f "server/dist/main.js" ]]; then
    echo "🔨 Building NestJS server..."
    pnpm --filter server build
    echo "✅ NestJS server built!"
else
    echo "✅ server/dist exists, skipping NestJS build"
fi

# ---------------------------------------------------------
# 4. 注入环境变量
# ---------------------------------------------------------
if [ -n "${COZE_PROJECT_DOMAIN_DEFAULT:-}" ]; then
    export PROJECT_DOMAIN="$COZE_PROJECT_DOMAIN_DEFAULT"
fi

# ---------------------------------------------------------
# 5. 启动单进程 NestJS（同时服务前端 + API）
# ---------------------------------------------------------
cleanup_on_exit() {
    echo "🛑 Shutting down..."
    kill -- -$$ 2>/dev/null || true
    rm -f "${PID_FILE}"
    exit 0
}
trap cleanup_on_exit EXIT INT TERM HUP

echo "🚀 Starting NestJS server on port ${PORT} (API + static files)..."
cd "${COZE_WORKSPACE_PATH}"

node server/dist/main.js -p "${PORT}" &
DEV_PID=$!
echo "${DEV_PID}" > "${PID_FILE}"
echo "📝 Server started with PID: ${DEV_PID}"

wait "${DEV_PID}" || true
