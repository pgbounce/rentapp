import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import net from "node:net";
import test from "node:test";

const adminDatabaseUrl =
  process.env.DATABASE_ADMIN_URL ??
  "postgresql://postgres:postgres@localhost:5432/toprent";

function readHostAndPort(urlString, fallbackPort) {
  const url = new URL(urlString);

  return {
    host: url.hostname || "127.0.0.1",
    port: Number(url.port || fallbackPort),
  };
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });

    socket.once("error", () => {
      resolve(false);
    });
  });
}

test("database rejects non-normalized public identifiers", async (t) => {
  const databaseAddress = readHostAndPort(adminDatabaseUrl, 5432);
  const databaseReady = await isPortOpen(
    databaseAddress.host,
    databaseAddress.port,
  );

  if (!databaseReady) {
    t.skip("postgres is not available");
    return;
  }

  const { default: pg } = await import("pg");
  const { Client } = pg;
  const client = new Client({ connectionString: adminDatabaseUrl });
  const tenantId = randomUUID();
  const userId = randomUUID();

  await client.connect();

  try {
    await assert.rejects(
      () =>
        client.query(
          `insert into tenants (id, slug, name, kind, status)
           values ($1, $2, $3, 'client', 'active')`,
          [tenantId, "Tenant Bad", "Tenant Bad"],
        ),
      (error) =>
        error instanceof Error &&
        /tenants_slug_format_check|check constraint/i.test(error.message),
    );

    await assert.rejects(
      () =>
        client.query(
          `insert into users (id, email, display_name, status)
           values ($1, $2, $3, 'active')`,
          [userId, "Admin@Example.com", "Admin"],
        ),
      (error) =>
        error instanceof Error &&
        /users_email_normalized_check|check constraint/i.test(error.message),
    );
  } finally {
    await client.end();
  }
});
