import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "[Sea Regent] DATABASE_URL is not set. Set it in .env.local. API routes that use the database will return 500."
  );
}

function getConnectionConfig() {
  if (!connectionString) return { connectionString: undefined, ssl: undefined };
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    return {
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    return { connectionString, ssl: { rejectUnauthorized: false } };
  }
}

const { connectionString: poolConnectionString, ssl: poolSsl } = getConnectionConfig();
const pool = new Pool({
  connectionString: poolConnectionString,
  ssl: poolConnectionString ? poolSsl : undefined,
});

export async function query(text: string, params?: unknown[]) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export default pool;
