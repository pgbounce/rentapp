export type TenantKind = "platform" | "customer";

export type TenantCapability = "partner_management";

export type PlatformUserRole = "platform_owner" | "platform_admin";

export type TenantUserRole = "tenant_owner" | "tenant_admin" | "tenant_staff";

export type PartnerUserRole = "partner_admin" | "partner_staff";

export interface TenantScope {
  tenantId: string;
  tenantKind: TenantKind;
  capabilities: TenantCapability[];
}
