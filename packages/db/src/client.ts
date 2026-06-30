import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export function createDbPool(connectionString: string) {
  return new Pool({ connectionString });
}

export function createDbClient(connectionString: string) {
  return drizzle(createDbPool(connectionString));
}
