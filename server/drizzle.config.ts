import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/storage/database/shared/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.PGDATABASE_URL || '',
  },
});