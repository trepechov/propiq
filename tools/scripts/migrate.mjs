/**
 * Migration runner — executes all SQL files in supabase/migrations/ in order.
 * Usage: node tools/scripts/migrate.mjs
 */
import pg from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const env = readFileSync('.env', 'utf8')
  .split('\n')
  .filter(l => l && !l.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...rest] = line.split('=')
    acc[key.trim()] = rest.join('=').trim()
    return acc
  }, {})

const client = new pg.Client({ connectionString: env.DATABASE_URL })
await client.connect()

const migrationsDir = 'supabase/migrations'
const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  console.log(`Running ${file}...`)
  await client.query(sql)
  console.log(`✓ ${file} complete`)
}

await client.end()
