#!/usr/bin/env bun

/**
 * Database migration script
 * Runs Drizzle migrations with environment variables loaded
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('💡 Make sure you have a .env.local file with DATABASE_URL\n');
    process.exit(1);
  }

  console.log('🔄 Running database migrations...\n');

  try {
    const sql = neon(databaseUrl);
    const db = drizzle({ client: sql });

    await migrate(db, { migrationsFolder: './drizzle/migrations' });

    console.log('✅ Migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

runMigrations();
