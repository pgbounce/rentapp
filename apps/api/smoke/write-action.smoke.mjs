import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import net from "node:net";
import test from "node:test";
import { partners, tenants } from "@toprent/db";
import { createApp } from "../dist/bootstrap/create-app.js";
import { DbService } from "../dist/infrastructure/db/db.service.js";

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

test("runWriteAction resolves a fresh internal write scope", async (t) => {
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
  const app = await createApp();
  const adminClient = new Client({ connectionString: adminDatabaseUrl });
  const suffix = randomUUID().slice(0, 8);
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const partnerId = randomUUID();
  const otherPartnerId = randomUUID();
  const activeUserId = randomUUID();
  const disabledUserId = randomUUID();
  const tenantUserId = randomUUID();
  const platformUserId = randomUUID();
  const tenantManagedUserId = randomUUID();
  const partnerManagedUserId = randomUUID();
  const platformManagedPartnerUserId = randomUUID();
  const platformCreatedPartnerId = randomUUID();
  const tenantCreatedPartnerId = randomUUID();

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  await adminClient.connect();

  try {
    await adminClient.query("begin");
    await adminClient.query(
      `insert into tenants (id, slug, name, kind, status)
      values
        ($1, $2, $3, 'client', 'active'),
        ($4, $5, $6, 'client', 'active')`,
      [
        tenantId,
        `tenant-${suffix}`,
        `Tenant ${suffix}`,
        otherTenantId,
        `tenant-other-${suffix}`,
        `Other Tenant ${suffix}`,
      ],
    );
    await adminClient.query(
      `insert into partners (id, tenant_id, slug, name, status)
      values
        ($1, $2, $3, $4, 'active'),
        ($5, $6, $7, $8, 'active')`,
      [
        partnerId,
        tenantId,
        `partner-${suffix}`,
        `Partner ${suffix}`,
        otherPartnerId,
        otherTenantId,
        `partner-other-${suffix}`,
        `Other Partner ${suffix}`,
      ],
    );
    await adminClient.query(
      `insert into users (id, email, display_name, status)
      values
        ($1, $2, $3, 'active'),
        ($4, $5, $6, 'active'),
        ($7, $8, $9, 'active'),
        ($10, $11, $12, 'active'),
        ($13, $14, $15, 'active'),
        ($16, $17, $18, 'active'),
        ($19, $20, $21, 'active')`,
      [
        activeUserId,
        `active-${suffix}@example.com`,
        "Active User",
        disabledUserId,
        `disabled-${suffix}@example.com`,
        "Disabled User",
        tenantUserId,
        `tenant-${suffix}@example.com`,
        "Tenant User",
        platformUserId,
        `platform-${suffix}@example.com`,
        "Platform User",
        tenantManagedUserId,
        `tenant-managed-${suffix}@example.com`,
        "Tenant Managed User",
        partnerManagedUserId,
        `partner-managed-${suffix}@example.com`,
        "Partner Managed User",
        platformManagedPartnerUserId,
        `platform-partner-${suffix}@example.com`,
        "Platform Managed Partner User",
      ],
    );
    await adminClient.query(
      `insert into memberships (user_id, tenant_id, partner_id, scope, role, status)
      values
        ($1, $2, $3, 'partner', 'partner', 'active'),
        ($4, $2, $3, 'partner', 'partner', 'disabled'),
        ($5, $2, null, 'tenant', 'tenant', 'active'),
        ($6, null, null, 'platform', 'platform', 'active')`,
      [
        activeUserId,
        tenantId,
        partnerId,
        disabledUserId,
        tenantUserId,
        platformUserId,
      ],
    );
    await adminClient.query("commit");

    const dbService = app.get(DbService);
    const scopeResult = await dbService.runWriteAction(
      {
        userId: activeUserId,
        targetTenantId: tenantId,
        targetPartnerId: partnerId,
      },
      async (db) => {
        const visiblePartners = await db
          .select({ id: partners.id })
          .from(partners);
        const visibleTenants = await db
          .select({ id: tenants.id })
          .from(tenants);

        return {
          partnerIds: visiblePartners.map((partner) => partner.id),
          tenantIds: visibleTenants.map((tenant) => tenant.id),
        };
      },
    );

    assert.deepEqual(scopeResult, {
      partnerIds: [partnerId],
      tenantIds: [tenantId],
    });

    const tenantScopeResult = await dbService.runWriteAction(
      {
        userId: tenantUserId,
        targetTenantId: tenantId,
        targetPartnerId: null,
      },
      async (db) => {
        const visiblePartners = await db
          .select({ id: partners.id })
          .from(partners);
        const visibleTenants = await db
          .select({ id: tenants.id })
          .from(tenants);

        return {
          partnerIds: visiblePartners.map((partner) => partner.id),
          tenantIds: visibleTenants.map((tenant) => tenant.id),
        };
      },
    );

    assert.deepEqual(tenantScopeResult, {
      partnerIds: [partnerId],
      tenantIds: [tenantId],
    });

    const platformScopeResult = await dbService.runWriteAction(
      {
        userId: platformUserId,
        targetTenantId: tenantId,
        targetPartnerId: partnerId,
      },
      async (db) => {
        const result = await db.$client.query(
          `select
            app.current_tenant_id()::text as tenant_id,
            app.current_partner_id()::text as partner_id,
            app.current_role() as role`,
        );

        return result.rows[0];
      },
    );

    assert.deepEqual(platformScopeResult, {
      tenant_id: tenantId,
      partner_id: partnerId,
      role: "platform",
    });

    const insertedPartnerId = await dbService.runWriteAction(
      {
        userId: platformUserId,
        targetTenantId: tenantId,
        targetPartnerId: null,
      },
      async (db) => {
        const result = db.expectMutation(
          await db.$client.query(
            `insert into partners (id, tenant_id, slug, name, status)
             values ($1, $2, $3, $4, 'active')
             returning id`,
            [
              platformCreatedPartnerId,
              tenantId,
              `platform-created-${suffix}`,
              `Platform Created ${suffix}`,
            ],
          ),
          "insert platform partner",
        );

        return result.rows[0]?.id ?? null;
      },
    );

    assert.equal(insertedPartnerId, platformCreatedPartnerId);

    await assert.rejects(
      () =>
        dbService.runWriteAction(
          {
            userId: tenantUserId,
            targetTenantId: tenantId,
            targetPartnerId: null,
          },
          async (db) => {
            await db.$client.query(
              `insert into partners (id, tenant_id, slug, name, status)
               values ($1, $2, $3, $4, 'active')`,
              [
                tenantCreatedPartnerId,
                tenantId,
                `tenant-created-${suffix}`,
                `Tenant Created ${suffix}`,
              ],
            );
          },
        ),
      (error) =>
        error instanceof Error &&
        /row-level security policy/i.test(error.message),
    );

    await dbService.runWriteAction(
      {
        userId: tenantUserId,
        targetTenantId: tenantId,
        targetPartnerId: null,
      },
      async (db) => {
        db.expectMutation(
          await db.$client.query(
            `insert into memberships (user_id, tenant_id, partner_id, scope, role, status)
             values ($1, $2, null, 'tenant', 'tenant', 'invited')`,
            [tenantManagedUserId, tenantId],
          ),
          "insert tenant membership",
        );
      },
    );

    await assert.rejects(
      () =>
        dbService.runWriteAction(
          {
            userId: tenantUserId,
            targetTenantId: tenantId,
            targetPartnerId: null,
          },
          async (db) => {
            await db.$client.query(
              `insert into memberships (user_id, tenant_id, partner_id, scope, role, status)
               values ($1, $2, $3, 'partner', 'partner', 'invited')`,
              [partnerManagedUserId, tenantId, partnerId],
            );
          },
        ),
      (error) =>
        error instanceof Error &&
        /row-level security policy/i.test(error.message),
    );

    await dbService.runWriteAction(
      {
        userId: platformUserId,
        targetTenantId: tenantId,
        targetPartnerId: partnerId,
      },
      async (db) => {
        db.expectMutation(
          await db.$client.query(
            `insert into memberships (user_id, tenant_id, partner_id, scope, role, status)
             values ($1, $2, $3, 'partner', 'partner', 'invited')`,
            [platformManagedPartnerUserId, tenantId, partnerId],
          ),
          "insert partner membership as platform",
        );
      },
    );

    await assert.rejects(
      () =>
        dbService.runWriteAction(
          {
            userId: platformUserId,
            targetTenantId: tenantId,
            targetPartnerId: null,
          },
          async (db) => {
            db.expectMutation(
              await db.$client.query(
                `update partners
                 set name = name
                 where tenant_id = $1
                   and id = $2
                   and false`,
                [tenantId, partnerId],
              ),
              "noop partner update",
            );
          },
        ),
      (error) =>
        error instanceof Error &&
        /Write invariant failed for "noop partner update"/.test(error.message),
    );

    await assert.rejects(
      () =>
        dbService.runWriteAction(
          {
            userId: disabledUserId,
            targetTenantId: tenantId,
            targetPartnerId: partnerId,
          },
          async () => "unexpected",
        ),
      (error) => error?.getStatus?.() === 403,
    );
  } finally {
    await adminClient.end();
    await app.close();
  }
});
