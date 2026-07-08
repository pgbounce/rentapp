import type { ActorSnapshot } from "@toprent/contracts";

export interface RequestContextValue extends ActorSnapshot {
  requestId: string;
}

function createActorSnapshot(): ActorSnapshot {
  return {
    actorKind: "anonymous",
    userId: null,
    customerId: null,
    customerAccountId: null,
    tenantId: null,
    partnerId: null,
    role: null,
    capabilities: [],
  };
}

export function createRequestContext(requestId: string): RequestContextValue {
  return {
    requestId,
    ...createActorSnapshot(),
  };
}
