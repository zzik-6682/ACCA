import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// 加载 .env 文件
dotenv.config({ path: resolve(__dirname, '../../.env') });

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function getEnvVar(name: string): string | undefined {
  // 优先使用标准环境变量名，兼容 sandbox 环境变量名
  return process.env[name] || process.env[`COZE_${name}`];
}

function getSupabaseCredentials(): SupabaseCredentials {
  const url = getEnvVar('SUPABASE_URL');
  const anonKey = getEnvVar('SUPABASE_ANON_KEY');

  if (!url) throw new Error('SUPABASE_URL or COZE_SUPABASE_URL is not set');
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY or COZE_SUPABASE_ANON_KEY is not set');

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  return getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
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

  return createClient(url, key, {
    global: globalOptions,
    db: { timeout: 60000 },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export { getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
