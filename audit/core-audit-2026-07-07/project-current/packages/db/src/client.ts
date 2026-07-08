import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { Pool } from "pg";
import { schema } from "./schema";

type DbClient = Pool | PoolClient;

export function createDbPool(connectionString: string) {
  return new Pool({ connectionString });
}

export function createDb(client: DbClient) {
  return drizzle(client, { schema });
}
