import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../dist/bootstrap/create-app.js";
import { DbService } from "../dist/infrastructure/db/db.service.js";
import { extractTenantSlug } from "../dist/runtime/request/tenant-resolver.js";

test("extractTenantSlug returns null for localhost hostname", () => {
  const slug = extractTenantSlug({
    hostname: "localhost",
  });

  assert.equal(slug, null);
});

test("tenant resolver reads tenant slug from request hostname", () => {
  const slug = extractTenantSlug({
    hostname: "tenant-main.example.com",
  });

  assert.equal(slug, "tenant-main");
});

test("public request resolves tenant from Host instead of X-Forwarded-Host", async () => {
  const app = await createApp();
  const dbService = app.get(DbService);
  const originalResolvePublicTenantBySlug =
    dbService.resolvePublicTenantBySlug.bind(dbService);
  const resolvedSlugs = [];

  dbService.resolvePublicTenantBySlug = async (slug) => {
    resolvedSlugs.push(slug);
    return "00000000-0000-0000-0000-000000000001";
  };

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/",
      headers: {
        host: "tenant-real.example.com",
        "x-forwarded-host": "tenant-evil.example.com",
        "x-request-id": "h1-http",
      },
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(resolvedSlugs, ["tenant-real"]);
  } finally {
    dbService.resolvePublicTenantBySlug = originalResolvePublicTenantBySlug;
    await app.close();
  }
});
