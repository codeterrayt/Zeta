import { Pool } from "pg"
import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(__dirname, "../.env") })

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })

async function main() {
  const res = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'Sprint';
  `)
  console.log("Columns for 'Sprint' table:")
  console.table(res.rows)
}

main()
  .catch(e => console.error(e))
  .finally(() => pool.end())
