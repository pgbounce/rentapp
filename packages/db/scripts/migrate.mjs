import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  ensureAdminRoleCanBypassRls,
  quoteIdentifier,
  readAdminConnectionString,
  readAdminRoleName,
  readRuntimeRoleConfig,
} from "./shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../migrations");

const { Client } = pg;

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists app_migrations (
      name text primary key,
      created_at timestamptz not null default now()
    )
  `);
}

async function readMigrationNames() {
  const entries = await readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function ensureRuntimeRoleExists(client, roleName) {
  const result = await client.query(
    `select exists (
      select 1
      from pg_roles
      where rolname = $1
    ) as role_exists`,
    [roleName],
  );

  if (result.rows[0]?.role_exists) {
    return;
  }

  throw new Error(
    `Database role "${roleName}" does not exist. Run "pnpm db:provision" first.`,
  );
}

function renderMigration(sql, roleName) {
  return sql.replaceAll("{{app_role}}", quoteIdentifier(roleName));
}

async function main() {
  const connectionString = readAdminConnectionString();
  const adminRoleName = readAdminRoleName();
  const { roleName } = readRuntimeRoleConfig();
  const client = new Client({ connectionString });

  if (roleName === adminRoleName) {
    throw new Error(
      "DATABASE_URL must use a dedicated app role, not the admin role",
    );
  }

  await client.connect();

  try {
    await ensureAdminRoleCanBypassRls(client);
    await ensureRuntimeRoleExists(client, roleName);
    await ensureMigrationsTable(client);

    const applied = new Set(
      (
        await client.query("select name from app_migrations order by name asc")
      ).rows.map((row) => row.name),
    );
    const names = await readMigrationNames();

    for (const name of names) {
      if (applied.has(name)) {
        continue;
      }

      const sql = renderMigration(
        await readFile(path.join(migrationsDir, name), "utf8"),
        roleName,
      );

      await client.query("begin");

      try {
        await client.query(sql);
        await client.query("insert into app_migrations (name) values ($1)", [
          name,
        ]);
        await client.query("commit");
        console.log(`applied ${name}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
