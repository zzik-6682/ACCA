import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './shared/schema'

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

function loadEnv(): void {
  try {
    require('dotenv').config()
  } catch {
    // ignore
  }
}

function getDb() {
  if (dbInstance) return dbInstance

  loadEnv()

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.PGDATABASE_URL ||
    process.env.DB_URL

  let pool: Pool
  if (connectionString) {
    pool = new Pool({ connectionString })
  } else {
    const host = process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost'
    const port = parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432')
    const user = process.env.DB_USER || process.env.POSTGRES_USER || 'postgres'
    const password = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || ''
    const database = process.env.DB_NAME || process.env.POSTGRES_DB || 'acca_stats'
    pool = new Pool({ host, port, user, password, database })
  }

  dbInstance = drizzle(pool, { schema })
  console.log(`[drizzle] connected to ${connectionString ? 'connection-string' : 'localhost'}`)
  return dbInstance
}

export { getDb }
