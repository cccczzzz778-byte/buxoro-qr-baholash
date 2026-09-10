import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { seedInstitutions } from './seed.mjs';
import { hashPassword } from './security.mjs';

export { sql };
let instance;
const migrationsFolder = fileURLToPath(new URL('./migrations/', import.meta.url));

export function normalizedName(name, district) {
  return `${name}|${district}`.normalize('NFKC').toLowerCase().replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();
}
export function database() {
  if (!instance) instance = initialize().catch(error => { instance = undefined; throw error; });
  return instance;
}
async function initialize() {
  let connection;
  if (process.env.DATABASE_URL) {
    const [{ Pool }, { drizzle }, { migrate }] = await Promise.all([
      import('pg'), import('drizzle-orm/node-postgres'), import('drizzle-orm/node-postgres/migrator')
    ]);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 15000, connectionTimeoutMillis: 15000 });
    if (process.env.VERCEL) (await import('@vercel/functions')).attachDatabasePool(pool);
    const migrationPool = process.env.DATABASE_URL_UNPOOLED ? new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, max: 1, connectionTimeoutMillis: 15000 }) : pool;
    const client = await migrationPool.connect();
    try {
      await client.query('SELECT pg_advisory_lock(84712504)');
      await migrate(drizzle(client), { migrationsFolder });
    } finally {
      await client.query('SELECT pg_advisory_unlock(84712504)').catch(() => {});
      client.release();
      if (migrationPool !== pool) await migrationPool.end();
    }
    const orm = drizzle(pool);
    connection = { mode: 'postgres', all: async query => (await orm.execute(query)).rows, close: () => pool.end() };
  } else {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production.');
    const { DatabaseSync } = await import('node:sqlite');
    const path = resolve(process.env.SQLITE_PATH || 'data/buxoro.sqlite');
    await mkdir(dirname(path), { recursive: true });
    const sqlite = new DatabaseSync(path);
    sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    sqlite.exec('CREATE TABLE IF NOT EXISTS __local_migrations (hash TEXT PRIMARY KEY)');
    for (const migration of readMigrationFiles({ migrationsFolder })) {
      if (sqlite.prepare('SELECT hash FROM __local_migrations WHERE hash = ?').get(migration.hash)) continue;
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        for (const statement of migration.sql) sqlite.exec(statement);
        sqlite.prepare('INSERT INTO __local_migrations (hash) VALUES (?)').run(migration.hash);
        sqlite.exec('COMMIT');
      } catch (error) { sqlite.exec('ROLLBACK'); sqlite.close(); throw error; }
    }
    const dialect = new PgDialect();
    connection = { mode: 'sqlite', all: async query => { const compiled = dialect.sqlToQuery(query); const params = []; const text = compiled.sql.replace(/\$(\d+)/g, (_, index) => { params.push(compiled.params[Number(index) - 1]); return '?'; }); const statement = sqlite.prepare(text); return statement.columns().length ? statement.all(...params) : (statement.run(...params), []); }, close: async () => sqlite.close() };
  }
  try {
    const now = new Date().toISOString();
    if (!(await connection.all(sql`SELECT key FROM app_settings WHERE key = 'seed_v2'`)).length) {
      const rows = seedInstitutions.map(i => sql`(${i.id}, ${i.name}, ${i.district}, '', ${normalizedName(i.name, i.district)}, 1, ${now})`);
      await connection.all(sql`INSERT INTO institutions (id, name, district, address, name_key, active, created_at) VALUES ${sql.join(rows, sql`, `)} ON CONFLICT DO NOTHING`);
      await connection.all(sql`INSERT INTO app_settings (key,value) VALUES ('seed_v2','1') ON CONFLICT DO NOTHING`);
    }
    if (!(await connection.all(sql`SELECT key FROM app_settings WHERE key = 'admin_password'`)).length) {
      if ((process.env.ADMIN_PASSWORD || '').length < 12) throw new Error('Set ADMIN_PASSWORD (at least 12 characters).');
      await connection.all(sql`INSERT INTO app_settings (key,value) VALUES ('admin_password',${await hashPassword(process.env.ADMIN_PASSWORD)}) ON CONFLICT DO NOTHING`);
    }
    return connection;
  } catch (error) { await connection.close(); throw error; }
}
export async function closeDatabase() { if (instance) await (await instance).close(); instance = undefined; }
