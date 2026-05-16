import { Pool } from "pg"
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const res = await pool.query('SELECT count(*) FROM "Comment"')
  console.log("Comment count:", res.rows[0].count)
  const last = await pool.query('SELECT * FROM "Comment" ORDER BY "createdAt" DESC LIMIT 1')
  console.log("Last comment:", JSON.stringify(last.rows[0], null, 2))
}

main().finally(() => pool.end())
