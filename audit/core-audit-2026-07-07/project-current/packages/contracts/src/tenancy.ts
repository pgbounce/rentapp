export type TenantKind = "platform" | "client";

export type PlatformUserRole = "platform";

export type TenantUserRole = "tenant";

export type PartnerUserRole = "partner";

export type ActorKind = "anonymous" | "internal" | "customer";

export type ActorRole = PlatformUserRole | TenantUserRole | PartnerUserRole;

export interface AnonymousActorSnapshot {
  actorKind: "anonymous";
}

export interface CustomerActorSnapshot {
  actorKind: "customer";
  tenantId: string;
  customerId: string;
}

export interface PlatformActorSnapshot {
  actorKind: "internal";
  userId: string;
  role: PlatformUserRole;
  tenantId: string | null;
  partnerId: string | null;
}

export interface TenantActorSnapshot {
  actorKind: "internal";
  userId: string;
  role: TenantUserRole;
  tenantId: string;
  partnerId: null;
}

export interface PartnerActorSnapshot {
  actorKind: "internal";
  userId: string;
  role: PartnerUserRole;
  tenantId: string;
  partnerId: string;
}

export type InternalActorSnapshot =
  | PlatformActorSnapshot
  | TenantActorSnapshot
  | PartnerActorSnapshot;

export type ActorSnapshot =
  | AnonymousActorSnapshot
  | CustomerActorSnapshot
  | InternalActorSnapshot;
