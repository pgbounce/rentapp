import type {
  ActorSnapshot,
  AnonymousActorSnapshot,
  InternalActorSnapshot,
} from "@toprent/contracts";
import type { PoolClient } from "pg";

export type DbSessionScope = ActorSnapshot;

function createAnonymousActorSnapshot(): AnonymousActorSnapshot {
  return { actorKind: "anonymous" };
}

function readCustomerId(scope: DbSessionScope) {
  return scope.actorKind === "customer" ? scope.customerId : "";
}

function readPartnerId(scope: DbSessionScope) {
  return scope.actorKind === "internal" ? (scope.partnerId ?? "") : "";
}

function readRole(scope: DbSessionScope) {
  return scope.actorKind === "internal" ? scope.role : "";
}

function readTenantId(scope: DbSessionScope) {
  if (scope.actorKind === "anonymous") {
    return "";
  }

  return scope.tenantId ?? "";
}

function readUserId(scope: DbSessionScope) {
  return scope.actorKind === "internal" ? scope.userId : "";
}

export function createDbSessionScope(
  snapshot: ActorSnapshot = createAnonymousActorSnapshot(),
): DbSessionScope {
  if (snapshot.actorKind === "anonymous") {
    return createAnonymousActorSnapshot();
  }

  if (snapshot.actorKind === "customer") {
    return {
      actorKind: "customer",
      tenantId: snapshot.tenantId,
      customerId: snapshot.customerId,
    };
  }

  return { ...snapshot } satisfies InternalActorSnapshot;
}

export async function applyDbSessionScope(
  client: PoolClient,
  scope: DbSessionScope,
) {
  await client.query(
    `select
      set_config('app.actor_kind', $1, true),
      set_config('app.tenant_id', $2, true),
      set_config('app.partner_id', $3, true),
      set_config('app.user_id', $4, true),
      set_config('app.customer_id', $5, true),
      set_config('app.role', $6, true)`,
    [
      scope.actorKind,
      readTenantId(scope),
      readPartnerId(scope),
      readUserId(scope),
      readCustomerId(scope),
      readRole(scope),
    ],
  );
}
