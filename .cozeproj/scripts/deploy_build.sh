#!/bin/bash
set -Eeuo pipefail

cd "${COZE_WORKSPACE_PATH}"
if [ -f "./.cozeproj/scripts/init_env.sh" ]; then
    echo "⚙️ Initializing environment..."
    # 使用 bash 执行，确保即使没有 x 权限也能跑
    bash ./.cozeproj/scripts/init_env.sh
else
    echo "⚠️ Warning: init_env.sh not found, skipping environment init."
fi
echo "Installing dependencies..."
# 使用 --ignore-scripts 跳过原生模块编译（better-sqlite3 仅 drizzle-kit 需要，运行时不需要）
pnpm install --ignore-scripts

echo "Building the Taro project..."
pnpm build

echo "Build completed successfully! Assets are in /dist"
