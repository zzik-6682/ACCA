import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function tryLoadDotenv(): void {
  try {
    require('dotenv').config();
  } catch {
    // dotenv not available
  }
}

function tryLoadFromPython(): boolean {
  try {
    const pythonCode = `
import os, sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;
    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

function loadEnv(): void {
  if (envLoaded) return;

  // 优先使用标准环境变量（外部部署）
  const hasStdEnv = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  // 或者 sandbox 环境变量
  const hasCozeEnv = !!(process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY);

  if (hasStdEnv || hasCozeEnv) {
    envLoaded = true;
    return;
  }

  // 尝试 .env 文件
  tryLoadDotenv();
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    envLoaded = true;
    return;
  }

  // 尝试 sandbox Python 方式
  if (tryLoadFromPython()) {
    envLoaded = true;
    return;
  }

  envLoaded = true;
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  const url = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY;

  if (!url) throw new Error('SUPABASE_URL is not set');
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY is not set');

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  const globalOptions: Record<string, any> = {};
  if (token) {
    globalOptions.headers = { Authorization: `Bearer ${token}` };
  }

  // 尝试加载 coze reporting（sandbox 环境），外部部署时跳过
  try {
    const { getReportBuffer, createWrappedFetch } = require('coze-coding-dev-sdk');
    const buffer = getReportBuffer();
    if (buffer) {
      globalOptions.fetch = createWrappedFetch(buffer, 'supabase');
    }
  } catch {
    // 外部部署没有 coze-coding-dev-sdk，跳过
  }

  return createClient(url, key, {
    global: globalOptions,
    db: { timeout: 60000 },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
