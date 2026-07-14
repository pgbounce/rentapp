const defaultRuntimeConnectionString =
  "postgresql://toprent_app:toprent_app@localhost:5432/toprent";
const defaultAdminConnectionString =
  "postgresql://postgres:postgres@localhost:5432/toprent";
const roleNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

function readNodeEnv() {
  return process.env.NODE_ENV ?? "development";
}

function readEnvString(name, fallbackValue) {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (readNodeEnv() === "production") {
    throw new Error(`${name} must be set in production`);
  }

  return fallbackValue;
}

function readRuntimeConnectionUrl() {
  return new URL(readEnvString("DATABASE_URL", defaultRuntimeConnectionString));
}

function readAdminConnectionUrl() {
  return new URL(
    readEnvString("DATABASE_ADMIN_URL", defaultAdminConnectionString),
  );
}

function readRoleName(url, envName) {
  const roleName = decodeURIComponent(url.username);

  if (!roleNamePattern.test(roleName)) {
    throw new Error(
      `${envName} must use a PostgreSQL role name matching [A-Za-z_][A-Za-z0-9_]*`,
    );
  }

  return roleName;
}

function readPassword(url) {
  const password = decodeURIComponent(url.password);

  if (password.length === 0) {
    throw new Error("DATABASE_URL must include a password for the app role");
  }

  return password;
}

function readDatabaseName(url) {
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (databaseName.length === 0) {
    throw new Error("DATABASE_URL must include a database name");
  }

  return databaseName;
}

export function readAdminConnectionString() {
  return readAdminConnectionUrl().toString();
}

export function readAdminRoleName() {
  return readRoleName(readAdminConnectionUrl(), "DATABASE_ADMIN_URL");
}

export async function ensureAdminRoleCanBypassRls(client) {
  const result = await client.query(`
    select
      current_user as role_name,
      rolsuper,
      rolbypassrls
    from pg_roles
    where rolname = current_user
  `);
  const row = result.rows[0];

  if (!row) {
    throw new Error("Could not resolve the current PostgreSQL admin role");
  }

  if (row.rolsuper || row.rolbypassrls) {
    return;
  }

  throw new Error(
    `DATABASE_ADMIN_URL must connect as a role with SUPERUSER or BYPASSRLS. Current role "${row.role_name}" cannot own SECURITY DEFINER functions that must read FORCE RLS tables before session scope exists.`,
  );
}

export function readRuntimeRoleConfig() {
  const url = readRuntimeConnectionUrl();

  return {
    roleName: readRoleName(url, "DATABASE_URL"),
    password: readPassword(url),
    databaseName: readDatabaseName(url),
  };
}

export function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}
