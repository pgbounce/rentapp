import { isIP } from "node:net";
import { NotFoundException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { DbService } from "../../infrastructure/db/db.service";
import {
  type RequestContextValue,
  type RequestMode,
  createInternalRequestContext,
  createPublicRequestContext,
  createSystemRequestContext,
} from "./request-context";

export function extractTenantSlug(request: Pick<FastifyRequest, "hostname">) {
  if (typeof request.hostname !== "string" || request.hostname.length === 0) {
    return null;
  }

  const hostname = request.hostname.toLowerCase();

  if (hostname === "localhost" || isIP(hostname) !== 0) {
    return null;
  }

  const [tenantSlug, ...rest] = hostname.split(".");

  if (!tenantSlug || rest.length === 0) {
    return null;
  }

  return tenantSlug;
}

function createTenantNotFoundError() {
  return new NotFoundException({
    code: "tenant_not_found",
    message: "Tenant not found",
  });
}

export async function resolveRequestContext(
  requestId: string,
  request: FastifyRequest,
  requestMode: RequestMode,
  dbService: DbService,
): Promise<RequestContextValue> {
  if (requestMode === "system") {
    return createSystemRequestContext(requestId);
  }

  if (requestMode === "internal") {
    return createInternalRequestContext(requestId);
  }

  const tenantSlug = extractTenantSlug(request);

  if (!tenantSlug) {
    throw createTenantNotFoundError();
  }

  const resolvedTenantId =
    await dbService.resolvePublicTenantBySlug(tenantSlug);

  if (!resolvedTenantId) {
    throw createTenantNotFoundError();
  }

  return createPublicRequestContext(requestId, resolvedTenantId);
}
