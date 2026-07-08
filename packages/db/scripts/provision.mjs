import pg from "pg";
import {
  quoteIdentifier,
  quoteLiteral,
  readAdminConnectionString,
  readAdminRoleName,
  readRuntimeRoleConfig,
} from "./shared.mjs";

const { Client } = pg;

async function main() {
  const client = new Client({ connectionString: readAdminConnectionString() });
  const adminRoleName = readAdminRoleName();
  const { databaseName, password, roleName } = readRuntimeRoleConfig();
  const quotedDatabaseName = quoteIdentifier(databaseName);
  const quotedPassword = quoteLiteral(password);
  const quotedRoleName = quoteIdentifier(roleName);
  const roleNameLiteral = quoteLiteral(roleName);

  if (roleName === adminRoleName) {
    throw new Error(
      "DATABASE_URL must use a dedicated app role, not the admin role",
    );
  }

  await client.connect();

  try {
    await client.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_roles
          where rolname = ${roleNameLiteral}
        ) then
          create role ${quotedRoleName}
            login
            password ${quotedPassword}
            nosuperuser
            nocreatedb
            nocreaterole
            noinherit
            noreplication
            nobypassrls;
        else
          alter role ${quotedRoleName}
            with
              login
              password ${quotedPassword}
              nosuperuser
              nocreatedb
              nocreaterole
              noinherit
              noreplication
              nobypassrls;
        end if;
      end
      $$;
    `);
    await client.query(`alter role ${quotedRoleName} set row_security = on`);
    await client.query(
      `grant connect on database ${quotedDatabaseName} to ${quotedRoleName}`,
    );
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
