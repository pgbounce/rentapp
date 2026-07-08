import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import { createApp } from "../dist/bootstrap/create-app.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://toprent_app:toprent_app@localhost:5432/toprent";
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

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

test("api health endpoints respond with core runtime data", async (t) => {
  const postgresAddress = readHostAndPort(databaseUrl, 5432);
  const redisAddress = readHostAndPort(redisUrl, 6379);
  const [postgresReady, redisReady] = await Promise.all([
    isPortOpen(postgresAddress.host, postgresAddress.port),
    isPortOpen(redisAddress.host, redisAddress.port),
  ]);
  const app = await createApp();
  const liveRequestId = "smoke-live";
  const readyRequestId = "smoke-ready";
  const healthRequestId = "smoke-health";

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const liveResponse = await app.inject({
    method: "GET",
    url: "/api/v1/health/live",
    headers: {
      "x-request-id": liveRequestId,
    },
  });
  const readyResponse = await app.inject({
    method: "GET",
    url: "/api/v1/health/ready",
    headers: {
      "x-request-id": readyRequestId,
    },
  });
  const healthResponse = await app.inject({
    method: "GET",
    url: "/api/v1/health",
    headers: {
      "x-request-id": healthRequestId,
    },
  });

  assert.equal(liveResponse.statusCode, 200);
  assert.equal(liveResponse.headers["x-request-id"], liveRequestId);
  assert.equal(readyResponse.headers["x-request-id"], readyRequestId);
  assert.equal(healthResponse.headers["x-request-id"], healthRequestId);

  const liveBody = liveResponse.json();
  const readyBody = readyResponse.json();
  const healthBody = healthResponse.json();

  assert.equal(liveBody.service, "api-live");
  assert.equal(healthResponse.statusCode, 200);
  assert.equal(healthBody.service, "api");
  assert.equal(healthBody.checks, undefined);

  if (postgresReady && redisReady) {
    assert.equal(readyResponse.statusCode, 200);
    assert.equal(readyBody.service, "api-ready");
    assert.equal(Array.isArray(readyBody.checks), true);
    assert.equal(readyBody.checks.length, 2);
  } else {
    assert.equal(readyResponse.statusCode, 503);
    assert.equal(readyBody.error.code, "service_unavailable");
    assert.equal(readyBody.meta.requestId, readyRequestId);
    assert.equal(Array.isArray(readyBody.error.details), true);
  }

  await app.close();
});
