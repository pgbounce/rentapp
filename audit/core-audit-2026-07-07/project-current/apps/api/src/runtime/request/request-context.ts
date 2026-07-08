import type {
  ActorSnapshot,
  AnonymousActorSnapshot,
  CustomerActorSnapshot,
  InternalActorSnapshot,
} from "@toprent/contracts";

export type RequestMode = "system" | "public" | "internal";

export type RequestContextValue =
  | {
      requestId: string;
      requestMode: "system";
      actor: AnonymousActorSnapshot;
    }
  | {
      requestId: string;
      requestMode: "public";
      resolvedTenantId: string;
      actor: AnonymousActorSnapshot | CustomerActorSnapshot;
    }
  | {
      requestId: string;
      requestMode: "internal";
      actor: AnonymousActorSnapshot | InternalActorSnapshot;
    };

export function createAnonymousActorSnapshot(): AnonymousActorSnapshot {
  return { actorKind: "anonymous" };
}

export function createInternalRequestContext(
  requestId: string,
): RequestContextValue {
  return {
    requestId,
    requestMode: "internal",
    actor: createAnonymousActorSnapshot(),
  };
}

export function createPublicRequestContext(
  requestId: string,
  resolvedTenantId: string,
): RequestContextValue {
  return {
    requestId,
    requestMode: "public",
    resolvedTenantId,
    actor: createAnonymousActorSnapshot(),
  };
}

export function createSystemRequestContext(
  requestId: string,
): RequestContextValue {
  return {
    requestId,
    requestMode: "system",
    actor: createAnonymousActorSnapshot(),
  };
}

export function readRequestActorSnapshot(
  context: RequestContextValue | undefined,
): ActorSnapshot {
  return context?.actor ?? createAnonymousActorSnapshot();
}
